import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { serializeTurno } from "@/lib/turno-serialize";

type RouteParams = { params: Promise<{ id: string }> };

const turnoUpdateSchema = z.object({
  estado: z.literal("CANCELADO"),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = turnoUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const turno = await prisma.turno.update({
    where: { id },
    data: { estado: parsed.data.estado },
  });

  return NextResponse.json({ turno: serializeTurno(turno, user.role) });
}
