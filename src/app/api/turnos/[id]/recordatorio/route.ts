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
//
// PATCH marca el recordatorio como enviado; DELETE lo desmarca (tocar la
// insignia "Enviado" en Recordatorios, p.ej. si con el auto-marcado se abrió
// WhatsApp pero el mensaje nunca se mandó).
export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  return setRecordatorioEnviado(params, true);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  return setRecordatorioEnviado(params, false);
}

async function setRecordatorioEnviado(params: RouteParams["params"], value: boolean) {
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
    data: { recordatorioEnviado: value },
  });

  return NextResponse.json({ ok: true });
}
