import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { esMesValido } from "@/lib/admin-costos-ia";

const cotizacionInput = z.object({
  mes: z.string().refine(esMesValido, "Mes inválido."),
  arsPorUsd: z.coerce
    .number()
    .int("La cotización debe ser un número entero.")
    .positive("La cotización debe ser mayor a 0."),
});

export async function PUT(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = cotizacionInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { mes, arsPorUsd } = parsed.data;
  const cotizacion = await prisma.cotizacionDolar.upsert({
    where: { mes },
    create: { mes, arsPorUsd },
    update: { arsPorUsd },
  });
  return NextResponse.json({ cotizacion: { mes: cotizacion.mes, arsPorUsd: cotizacion.arsPorUsd } });
}
