import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { scheduleBlockSchema } from "@/lib/turno-schema";
import { encontrarSolapamiento } from "@/lib/schedule-block-guard";

export async function POST(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = scheduleBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const lugar = await prisma.lugarDeTrabajo.findFirst({
    where: { id: parsed.data.lugarId, userId: user.id, deletedAt: null },
  });
  if (!lugar) {
    return NextResponse.json({ error: "Elegí un lugar válido." }, { status: 400 });
  }

  const conflicto = await encontrarSolapamiento(
    user.id,
    parsed.data.diaSemana,
    parsed.data.horaInicio,
    parsed.data.horaFin
  );
  if (conflicto) {
    return NextResponse.json(
      {
        error: `Se superpone con ${conflicto.lugarLabel} (${conflicto.horaInicio} a ${conflicto.horaFin}).`,
      },
      { status: 409 }
    );
  }

  const block = await prisma.workScheduleBlock.create({
    data: {
      userId: user.id,
      lugarId: lugar.id,
      diaSemana: parsed.data.diaSemana,
      horaInicio: parsed.data.horaInicio,
      horaFin: parsed.data.horaFin,
    },
  });

  return NextResponse.json({ block }, { status: 201 });
}
