import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { getAranceles } from "@/lib/ingresos-server";
import { montosVigentes } from "@/lib/ingresos";
import { startOfDayBA } from "@/lib/timezone";

type RouteParams = { params: Promise<{ id: string }> };

const monto = z.number().int().min(0).max(100_000_000).nullable();

// `asistencia: null` desmarca. Los montos solo los manda el médico (desde
// el reporte de ingresos, para corregir lo que se congeló).
const asistenciaSchema = z.object({
  asistencia: z.enum(["ASISTIO", "AUSENTE"]).nullable(),
  montoCobertura: monto.optional(),
  montoPlus: monto.optional(),
});

// Marca si el paciente vino al turno (reporte de ingresos). Lo puede hacer
// el médico o su asistente -- mismo criterio de ownership que el resto de
// las rutas de turnos (un asistente solo toca turnos de su lugar activo) --,
// pero solo el médico ve y corrige montos.
//
// Al marcar ASISTIO se congelan los aranceles vigentes (ver
// `Turno.montoCobertura`); si ya estaba ASISTIO, se conservan los que tenía.
// Cualquier otro estado borra los montos.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, activeLugarId, response } = await requireUser({ escritura: true });
  if (response) return response;

  const { id } = await params;

  if (user.role === "SECRETARY" && activeLugarId === null) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = asistenciaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos.", issues: parsed.error.flatten() }, { status: 400 });
  }
  const esDoctor = user.role === "DOCTOR";
  const mandaMontos = parsed.data.montoCobertura !== undefined || parsed.data.montoPlus !== undefined;
  if (mandaMontos && !esDoctor) {
    return NextResponse.json({ error: "Solo el médico puede cargar montos." }, { status: 403 });
  }

  const turno = await prisma.turno.findFirst({
    where: {
      id,
      doctorId: tenantId,
      ...(user.role === "SECRETARY" ? { lugarId: activeLugarId! } : {}),
    },
    select: {
      estado: true,
      inicio: true,
      obraSocial: true,
      asistencia: true,
      montoCobertura: true,
      montoPlus: true,
    },
  });
  if (!turno) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }
  if (turno.estado !== "CONFIRMADO") {
    return NextResponse.json({ error: "El turno está cancelado." }, { status: 409 });
  }
  // Se puede marcar desde el mismo día del turno (el paciente puede llegar
  // antes de hora), nunca un turno de un día futuro.
  if (startOfDayBA(turno.inicio) > startOfDayBA(new Date())) {
    return NextResponse.json({ error: "Todavía no llegó el día del turno." }, { status: 409 });
  }

  const { asistencia } = parsed.data;
  let montos: { montoCobertura: number | null; montoPlus: number | null };
  if (asistencia !== "ASISTIO") {
    montos = { montoCobertura: null, montoPlus: null };
  } else if (turno.asistencia === "ASISTIO") {
    montos = { montoCobertura: turno.montoCobertura, montoPlus: turno.montoPlus };
  } else {
    montos = montosVigentes(turno.obraSocial, await getAranceles(tenantId));
  }
  if (asistencia === "ASISTIO") {
    if (parsed.data.montoCobertura !== undefined) montos.montoCobertura = parsed.data.montoCobertura;
    if (parsed.data.montoPlus !== undefined) montos.montoPlus = parsed.data.montoPlus;
  }

  const actualizado = await prisma.turno.update({
    where: { id },
    data: { asistencia, ...montos },
    select: { asistencia: true, montoCobertura: true, montoPlus: true },
  });

  return NextResponse.json(
    esDoctor ? actualizado : { asistencia: actualizado.asistencia }
  );
}
