import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// null vuelve al tope global (`TOPE_IA_USD_DEFAULT` en src/lib/ia-costos.ts).
const topeInput = z.object({
  topeIAUsd: z.coerce
    .number()
    .nonnegative("El tope no puede ser negativo.")
    .max(10_000, "El tope es demasiado alto.")
    .nullable(),
});

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = topeInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findFirst({ where: { id, role: "DOCTOR" }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }

  const doctor = await prisma.user.update({
    where: { id },
    data: { topeIAUsd: parsed.data.topeIAUsd },
    select: { topeIAUsd: true },
  });
  return NextResponse.json({ topeIAUsd: doctor.topeIAUsd });
}
