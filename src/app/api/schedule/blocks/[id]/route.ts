import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { scheduleBlockSchema } from "@/lib/turno-schema";

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

  await prisma.workScheduleBlock.deleteMany({ where: { id, userId: user.id } });

  return NextResponse.json({ ok: true });
}
