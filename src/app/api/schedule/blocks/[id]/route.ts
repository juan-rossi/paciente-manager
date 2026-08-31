import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { scheduleBlockSchema } from "@/lib/turno-schema";
import { countTurnosSinCoberturaTrasCambio } from "@/lib/schedule-block-guard";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = scheduleBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.workScheduleBlock.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Bloque no encontrado." }, { status: 404 });
  }

  const turnosSinCobertura = await countTurnosSinCoberturaTrasCambio(user.id, id, parsed.data);
  if (turnosSinCobertura > 0) {
    return NextResponse.json(
      {
        error: `No se puede editar este bloque: ${turnosSinCobertura} turno${turnosSinCobertura === 1 ? "" : "s"} agendado${turnosSinCobertura === 1 ? "" : "s"} quedaría${turnosSinCobertura === 1 ? "" : "n"} sin horario disponible.`,
      },
      { status: 409 }
    );
  }

  const block = await prisma.workScheduleBlock.update({
    where: { id },
    data: {
      diaSemana: parsed.data.diaSemana,
      horaInicio: parsed.data.horaInicio,
      horaFin: parsed.data.horaFin,
    },
  });

  return NextResponse.json({ block });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const existing = await prisma.workScheduleBlock.findFirst({ where: { id, userId: user.id } });
  if (!existing) {
    return NextResponse.json({ error: "Bloque no encontrado." }, { status: 404 });
  }

  const turnosSinCobertura = await countTurnosSinCoberturaTrasCambio(user.id, id, null);
  if (turnosSinCobertura > 0) {
    return NextResponse.json(
      {
        error: `No se puede eliminar este bloque: ${turnosSinCobertura} turno${turnosSinCobertura === 1 ? "" : "s"} agendado${turnosSinCobertura === 1 ? "" : "s"} quedaría${turnosSinCobertura === 1 ? "" : "n"} sin horario disponible.`,
      },
      { status: 409 }
    );
  }

  await prisma.workScheduleBlock.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
