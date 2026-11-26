import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { serializeTurno } from "@/lib/turno-serialize";
import { turnoEditSchema } from "@/lib/turno-schema";
import { limpiarAperturasSinTurnos } from "@/lib/horario-excepcional";
import { teleconsultaHabilitada } from "@/lib/feature-flags";
import { avisoPorCambioDeModalidad } from "@/lib/teleconsulta-modalidad";

type RouteParams = { params: Promise<{ id: string }> };

// `confirmado`: el médico/asistente marca a mano que el paciente confirmó
// (ej. avisó por teléfono) o lo desmarca -- ver `Turno.confirmadoAt`.
//
// `teleconsulta`: pasa un turno de un consultorio/particular a
// videollamada o lo vuelve a presencial, sin moverlo de lugar ni de horario
// (ver `Turno.teleconsulta`). `consentimientoRemoto`: el paciente aceptó la
// atención por videollamada (solo cuenta al pasarlo a teleconsulta).
const turnoUpdateSchema = z.union([
  z.object({ estado: z.literal("CANCELADO") }),
  z.object({ confirmado: z.boolean() }),
  z.object({ teleconsulta: z.boolean(), consentimientoRemoto: z.boolean().optional() }),
  turnoEditSchema,
]);

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, activeLugarId, response } = await requireUser({ escritura: true });
  if (response) return response;

  const { id } = await params;

  // Un asistente solo puede tocar turnos del lugar que tiene activo (ver
  // `resolveActiveLugarId`) -- si no tiene ninguno asignado, no ve ningún
  // turno como propio (un `lugarId: null` en el where matchearía turnos sin
  // lugar, que es justo lo que NO queremos acá).
  if (user.role === "SECRETARY" && activeLugarId === null) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }

  const owned = await prisma.turno.findFirst({
    where: {
      id,
      doctorId: tenantId,
      // El guard de arriba ya devolvió 404 si es SECRETARY sin lugar activo
      // -- acá `activeLugarId` no puede ser null en ese caso.
      ...(user.role === "SECRETARY" ? { lugarId: activeLugarId! } : {}),
    },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = turnoUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if ("estado" in parsed.data) {
    const turno = await prisma.turno.update({
      where: { id },
      data: { estado: parsed.data.estado },
    });
    // Si este turno era el último ocupando una apertura excepcional (día
    // libre habilitado al mover turnos de un bloqueo), esa apertura queda
    // sin uso -- el día vuelve a no disponible en vez de quedar abierto
    // indefinidamente a turnos nuevos que nadie pidió.
    await limpiarAperturasSinTurnos(turno.doctorId, turno.lugarId, turno.inicio);
    return NextResponse.json({ turno: serializeTurno(turno, user.role) });
  }

  if ("confirmado" in parsed.data) {
    const turno = await prisma.turno.update({
      where: { id },
      data: { confirmadoAt: parsed.data.confirmado ? new Date() : null },
    });
    return NextResponse.json({ turno: serializeTurno(turno, user.role) });
  }

  if ("teleconsulta" in parsed.data) {
    if (!teleconsultaHabilitada()) {
      return NextResponse.json({ error: "La teleconsulta no está disponible." }, { status: 403 });
    }
    const actual = await prisma.turno.findUniqueOrThrow({
      where: { id },
      select: {
        estado: true,
        fin: true,
        teleconsulta: true,
        avisoPendiente: true,
        avisoPendienteMotivo: true,
        lugar: { select: { tipo: true } },
      },
    });
    // Un turno de un lugar de Teleconsulta es videollamada por definición:
    // para atenderlo presencial hay que darle un turno en otro lugar.
    if (actual.lugar.tipo === "VIRTUAL") {
      return NextResponse.json(
        { error: "Los turnos de Teleconsulta no se pueden pasar a presencial." },
        { status: 409 }
      );
    }
    if (actual.estado === "CANCELADO") {
      return NextResponse.json({ error: "Este turno está cancelado." }, { status: 409 });
    }
    if (actual.fin <= new Date()) {
      return NextResponse.json({ error: "Este turno ya pasó." }, { status: 409 });
    }
    const { teleconsulta, consentimientoRemoto } = parsed.data;
    if (actual.teleconsulta === teleconsulta) {
      const turno = await prisma.turno.findUniqueOrThrow({ where: { id } });
      return NextResponse.json({ turno: serializeTurno(turno, user.role) });
    }

    const turno = await prisma.turno.update({
      where: { id },
      data: {
        teleconsulta,
        // Al volver a presencial el consentimiento deja de aplicar: si
        // después se lo vuelve a pasar, se pregunta de nuevo.
        consentimientoRemotoAt: teleconsulta && consentimientoRemoto ? new Date() : null,
        modalidadCambiadaAt: new Date(),
        modalidadCambiadaPorId: user.id,
        // La confirmación del paciente era para la otra modalidad.
        confirmadoAt: null,
        ...avisoPorCambioDeModalidad(actual, teleconsulta),
      },
    });
    return NextResponse.json({ turno: serializeTurno(turno, user.role) });
  }

  const patient = parsed.data.dni
    ? await prisma.patient.findFirst({
        where: { doctorId: tenantId, nroDocumento: parsed.data.dni, deletedAt: null },
        select: { id: true },
      })
    : null;

  const turno = await prisma.turno.update({
    where: { id },
    data: { ...parsed.data, patientId: patient?.id ?? null },
  });

  return NextResponse.json({ turno: serializeTurno(turno, user.role) });
}
