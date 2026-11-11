import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// Ver `prioridadDirectorio` en el schema: mayor número = más arriba en el
// directorio; 0 = sin prioridad.
const prioridadInput = z.object({
  prioridadDirectorio: z.coerce
    .number()
    .int("La prioridad tiene que ser un número entero.")
    .min(0, "La prioridad no puede ser negativa.")
    .max(999, "La prioridad máxima es 999."),
});

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = prioridadInput.safeParse(body);
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
    data: { prioridadDirectorio: parsed.data.prioridadDirectorio },
    select: { prioridadDirectorio: true },
  });
  return NextResponse.json({ prioridadDirectorio: doctor.prioridadDirectorio });
}
