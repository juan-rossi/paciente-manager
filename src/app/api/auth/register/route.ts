import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/register-schema";
import { nuevaFechaFinTrial } from "@/lib/plan";
import { TERMINOS_VERSION } from "@/lib/terminos";
import { PAGOS_HABILITADOS } from "@/lib/pagos";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ip = getClientIp(request);
  if (!(await rateLimitOk(ip, parsed.data.email, "registro"))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo más tarde." },
      { status: 429 }
    );
  }

  // `turnstileToken` no es un dato de la cuenta -- se lee aparte, igual que
  // en la reserva pública.
  const turnstileToken =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).turnstileToken === "string"
      ? ((body as Record<string, unknown>).turnstileToken as string)
      : "";
  if (!(await verifyTurnstileToken(turnstileToken, ip))) {
    return NextResponse.json(
      { error: "No pudimos verificar que sos una persona. Volvé a intentar." },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    // Sin pagos habilitados no se puede crear una cuenta Premium (quedaría
    // inactiva sin forma de pagar): se registra siempre como Básico con trial.
    const esPremium = PAGOS_HABILITADOS && parsed.data.plan === "PREMIUM";
    const ahora = new Date();

    await prisma.user.create({
      data: {
        email: parsed.data.email,
        nombre: parsed.data.nombre,
        apellido: parsed.data.apellido,
        nroMatricula: parsed.data.nroMatricula,
        tituloCortesia: parsed.data.tituloCortesia,
        especialidad: parsed.data.especialidad,
        passwordHash,
        terminosVersion: TERMINOS_VERSION,
        terminosAceptadosAt: ahora,
        declaracionProfesionalAt: ahora,
        role: "DOCTOR",
        // Premium no tiene período de prueba -- arranca sin trial y queda
        // inactiva hasta que se confirme el primer pago (ver signup-form.tsx,
        // que dispara el checkout de MercadoPago apenas se crea la cuenta).
        plan: esPremium ? "PREMIUM" : "BASICA",
        trialEndsAt: esPremium ? null : nuevaFechaFinTrial(),
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
  }
}
