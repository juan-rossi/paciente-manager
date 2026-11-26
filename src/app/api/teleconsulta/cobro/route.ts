import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { teleconsultaHabilitada } from "@/lib/feature-flags";
import { MONTO_TELECONSULTA_MAX, normalizarAliasCobro } from "@/lib/teleconsulta-cobro";

// Configuración > Teleconsulta > Cobro (ver `User.teleconsultaCobro` /
// `User.aliasCobro` / `User.montoTeleconsulta*`). Aparte de PATCH /api/teleconsulta: aquel se guarda al
// tocar cada opción, este con su propio botón (tiene un campo de texto).
const cobroSchema = z.object({
  teleconsultaCobro: z.enum(["ANTES", "DESPUES"]),
  aliasCobro: z.string().max(60).nullable(),
  montoTeleconsulta: z.number().int().min(0).max(MONTO_TELECONSULTA_MAX).nullable(),
  montoTeleconsultaUsaParticular: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  if (!teleconsultaHabilitada()) {
    return NextResponse.json({ error: "La teleconsulta no está disponible." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = cobroSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const alias = normalizarAliasCobro(parsed.data.aliasCobro);
  if (!alias.ok) return NextResponse.json({ error: alias.error }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      teleconsultaCobro: parsed.data.teleconsultaCobro,
      aliasCobro: alias.valor,
      montoTeleconsulta: parsed.data.montoTeleconsulta,
      montoTeleconsultaUsaParticular: parsed.data.montoTeleconsultaUsaParticular,
    },
    select: {
      teleconsultaCobro: true,
      aliasCobro: true,
      montoTeleconsulta: true,
      montoTeleconsultaUsaParticular: true,
    },
  });
  return NextResponse.json(updated);
}
