import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { scheduleBlockSchema } from "@/lib/turno-schema";

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

  const block = await prisma.workScheduleBlock.create({
    data: {
      userId: user.id,
      diaSemana: parsed.data.diaSemana,
      horaInicio: parsed.data.horaInicio,
      horaFin: parsed.data.horaFin,
    },
  });

  return NextResponse.json({ block }, { status: 201 });
}
