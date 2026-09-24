import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// "Marcar como notificado" en la sección "Pendientes de notificar" de
// Recordatorios -- saca el turno de esa lista. Mismo criterio de ownership
// que PATCH /api/turnos/[id] (una secretaria solo puede tocar turnos de su
// lugar activo).
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, activeLugarId, response } = await requireUser();
  if (response) return response;

  const { id } = await params;

  if (user.role === "SECRETARY" && activeLugarId === null) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }

  const owned = await prisma.turno.findFirst({
    where: {
      id,
      doctorId: tenantId,
      ...(user.role === "SECRETARY" ? { lugarId: activeLugarId! } : {}),
    },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }

  await prisma.turno.update({
    where: { id },
    data: { avisoPendiente: false, avisoPendienteMotivo: null, avisoPendienteFechaAnterior: null },
  });

  return NextResponse.json({ ok: true });
}
