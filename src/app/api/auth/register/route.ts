import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/register-schema";
import { nuevaFechaFinTrial } from "@/lib/plan";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const esPremium = parsed.data.plan === "PREMIUM";

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      nroMatricula: parsed.data.nroMatricula,
      tituloCortesia: parsed.data.tituloCortesia,
      especialidad: parsed.data.especialidad,
      passwordHash,
      role: "DOCTOR",
      // Premium no tiene período de prueba -- arranca sin trial y queda
      // inactiva hasta que se confirme el primer pago (ver signup-form.tsx,
      // que dispara el checkout de MercadoPago apenas se crea la cuenta).
      plan: esPremium ? "PREMIUM" : "BASICA",
      trialEndsAt: esPremium ? null : nuevaFechaFinTrial(),
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
