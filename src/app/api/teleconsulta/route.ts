import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { teleconsultaHabilitada } from "@/lib/feature-flags";
import { planPermiteTeleconsulta, validarConfigTeleconsulta } from "@/lib/teleconsulta-config";
import { TELECONSULTA_CONFIG_SELECT } from "@/lib/teleconsulta-medico";

// Configuración > Teleconsulta (ver `User.teleconsulta*`).
const teleconsultaConfigSchema = z.object({
  teleconsultaHabilitada: z.boolean(),
  teleconsultaPasarPresenciales: z.boolean(),
  teleconsultaLugarVirtual: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  if (!teleconsultaHabilitada()) {
    return NextResponse.json({ error: "La teleconsulta no está disponible." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = teleconsultaConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Función Premium: sin el plan se puede apagar, pero no prender.
  if (parsed.data.teleconsultaHabilitada && !planPermiteTeleconsulta(user)) {
    return NextResponse.json(
      { error: "La teleconsulta es parte del plan Premium." },
      { status: 403 }
    );
  }

  const lugarVirtual = await prisma.lugarDeTrabajo.findFirst({
    where: { userId: user.id, tipo: "VIRTUAL", deletedAt: null },
    select: { id: true },
  });
  const error = validarConfigTeleconsulta(parsed.data, !!lugarVirtual);
  if (error) return NextResponse.json({ error }, { status: 409 });

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: TELECONSULTA_CONFIG_SELECT,
  });
  return NextResponse.json(updated);
}
