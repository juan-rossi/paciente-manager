import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { slotDurationSchema } from "@/lib/turno-schema";

export async function GET() {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const blocks = await prisma.workScheduleBlock.findMany({
    where: { userId: user.id },
    orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }],
  });

  return NextResponse.json({ slotDurationMinutes: user.slotDurationMinutes, blocks });
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

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { slotDurationMinutes: parsed.data.slotDurationMinutes },
  });

  return NextResponse.json({ slotDurationMinutes: updated.slotDurationMinutes });
}
