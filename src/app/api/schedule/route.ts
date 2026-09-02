import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { slotDurationSchema } from "@/lib/turno-schema";
import { planReschedule, type ReprogramacionItem } from "@/lib/schedule-reschedule";
import { startOfDayBA } from "@/lib/timezone";

export async function GET() {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const blocks = await prisma.workScheduleBlock.findMany({
    where: { userId: user.id },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });

  return NextResponse.json({ slotDurationMinutes: user.slotDurationMinutes, blocks });
}

function serializeItem(item: ReprogramacionItem) {
  return {
    turnoId: item.turnoId,
    nombreYApellido: item.nombreYApellido,
    oldInicio: item.oldInicio.toISOString(),
    newInicio: item.newInicio.toISOString(),
  };
}

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = slotDurationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { slotDurationMinutes, applyReschedule } = parsed.data;

  if (slotDurationMinutes === user.slotDurationMinutes) {
    return NextResponse.json({ slotDurationMinutes: user.slotDurationMinutes });
  }

  const todayStart = startOfDayBA(new Date());

  const [blocks, turnosAfectados] = await Promise.all([
    prisma.workScheduleBlock.findMany({ where: { userId: user.id } }),
    prisma.turno.findMany({
      where: { estado: "CONFIRMADO", inicio: { gte: todayStart } },
      select: { id: true, nombreYApellido: true, inicio: true },
      orderBy: { inicio: "asc" },
    }),
  ]);

  if (turnosAfectados.length === 0) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { slotDurationMinutes },
    });
    return NextResponse.json({ slotDurationMinutes: updated.slotDurationMinutes });
  }

  const { plan, sinSolucion } = planReschedule(turnosAfectados, blocks, slotDurationMinutes);

  if (sinSolucion.length > 0) {
    return NextResponse.json(
      {
        error: `No se encontró horario disponible para ${sinSolucion.length} turno${sinSolucion.length === 1 ? "" : "s"}. Configurá más bloques de horario antes de cambiar la duración.`,
      },
      { status: 422 }
    );
  }

  if (plan.length === 0) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { slotDurationMinutes },
    });
    return NextResponse.json({ slotDurationMinutes: updated.slotDurationMinutes });
  }

  if (!applyReschedule) {
    return NextResponse.json(
      {
        error: `Cambiar la duración a ${slotDurationMinutes} minutos requiere reprogramar ${plan.length} turno${plan.length === 1 ? "" : "s"}.`,
        preview: plan.map(serializeItem),
      },
      { status: 409 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of plan) {
      await tx.turno.update({
        where: { id: item.turnoId },
        data: { inicio: item.newInicio, fin: item.newFin },
      });
    }
    return tx.user.update({ where: { id: user.id }, data: { slotDurationMinutes } });
  });

  return NextResponse.json({
    slotDurationMinutes: updated.slotDurationMinutes,
    rescheduled: plan.map(serializeItem),
  });
}
