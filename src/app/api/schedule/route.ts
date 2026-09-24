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

  return NextResponse.json({
    slotDurationMinutes: user.slotDurationMinutes,
    sobreturnosHabilitados: user.sobreturnosHabilitados,
    blocks,
  });
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

  const { slotDurationMinutes, applyReschedule, sobreturnosHabilitados } = parsed.data;
  // Sin valor explícito en el body (p.ej. al confirmar una reprogramación
  // pendiente), se mantiene el que ya tenía la cuenta.
  const nuevoSobreturnosHabilitados = sobreturnosHabilitados ?? user.sobreturnosHabilitados;

  if (slotDurationMinutes === user.slotDurationMinutes) {
    // El toggle de sobreturnos no depende de la duración -- se guarda igual
    // aunque la duración no haya cambiado, sin entrar a la lógica de
    // reprogramación de turnos de abajo.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { sobreturnosHabilitados: nuevoSobreturnosHabilitados },
    });
    return NextResponse.json({
      slotDurationMinutes: updated.slotDurationMinutes,
      sobreturnosHabilitados: updated.sobreturnosHabilitados,
    });
  }

  const todayStart = startOfDayBA(new Date());

  const [blocks, turnosAfectados, bloqueos] = await Promise.all([
    prisma.workScheduleBlock.findMany({ where: { userId: user.id } }),
    prisma.turno.findMany({
      where: { doctorId: user.id, estado: "CONFIRMADO", inicio: { gte: todayStart } },
      select: { id: true, nombreYApellido: true, inicio: true },
      orderBy: { inicio: "asc" },
    }),
    prisma.bloqueoHorario.findMany({ where: { userId: user.id, fin: { gt: todayStart } } }),
  ]);

  if (turnosAfectados.length === 0) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { slotDurationMinutes, sobreturnosHabilitados: nuevoSobreturnosHabilitados },
    });
    return NextResponse.json({
      slotDurationMinutes: updated.slotDurationMinutes,
      sobreturnosHabilitados: updated.sobreturnosHabilitados,
    });
  }

  const { plan, sinSolucion } = planReschedule(turnosAfectados, blocks, slotDurationMinutes, bloqueos);

  if (sinSolucion.length > 0) {
    return NextResponse.json(
      {
        error: `No se encontró horario disponible para ${sinSolucion.length} turno${sinSolucion.length === 1 ? "" : "s"}. Configurá tu agenda antes de cambiar la duración.`,
      },
      { status: 422 }
    );
  }

  if (plan.length === 0) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { slotDurationMinutes, sobreturnosHabilitados: nuevoSobreturnosHabilitados },
    });
    return NextResponse.json({
      slotDurationMinutes: updated.slotDurationMinutes,
      sobreturnosHabilitados: updated.sobreturnosHabilitados,
    });
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
    return tx.user.update({
      where: { id: user.id },
      data: { slotDurationMinutes, sobreturnosHabilitados: nuevoSobreturnosHabilitados },
    });
  });

  return NextResponse.json({
    slotDurationMinutes: updated.slotDurationMinutes,
    sobreturnosHabilitados: updated.sobreturnosHabilitados,
    rescheduled: plan.map(serializeItem),
  });
}
