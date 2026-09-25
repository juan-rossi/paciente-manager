import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// "Marcar como notificado" en la lista del día de Recordatorios -- a
// diferencia de `/api/turnos/[id]/aviso` (que apaga `avisoPendiente` de un
// turno cancelado/aplazado), esto es para el recordatorio NORMAL de un
// turno confirmado cualquiera: deja registro de que ya se le avisó, sin
// sacarlo de la lista del día. Mismo criterio de ownership que el resto de
// las rutas de turnos (una secretaria solo toca turnos de su lugar activo).
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
    data: { recordatorioEnviado: true },
  });

  return NextResponse.json({ ok: true });
}
