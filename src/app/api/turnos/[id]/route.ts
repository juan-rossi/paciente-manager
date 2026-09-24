import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { serializeTurno } from "@/lib/turno-serialize";
import { turnoEditSchema } from "@/lib/turno-schema";
import { limpiarAperturasSinTurnos } from "@/lib/horario-excepcional";

type RouteParams = { params: Promise<{ id: string }> };

const turnoUpdateSchema = z.union([z.object({ estado: z.literal("CANCELADO") }), turnoEditSchema]);

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, activeLugarId, response } = await requireUser();
  if (response) return response;

  const { id } = await params;

  // Una secretaria solo puede tocar turnos del lugar que tiene activo (ver
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
