import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

const dictadoSchema = z.object({
  resumenAutomatico: z.boolean(),
  resumenAutoAntecedentes: z.boolean(),
  resumenAutoEvoluciones: z.boolean(),
});

const select = {
  resumenAutomatico: true,
  resumenAutoAntecedentes: true,
  resumenAutoEvoluciones: true,
} as const;

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = dictadoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select,
  });

  return NextResponse.json(updated);
}
