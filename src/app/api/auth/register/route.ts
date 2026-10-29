import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/register-schema";
import { nuevaFechaFinTrial } from "@/lib/plan";
import { TERMINOS_VERSION } from "@/lib/terminos";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { enviarMailBienvenida } from "@/lib/bienvenida-email";
import { getSiteUrl } from "@/lib/site-url";
import { leerOrigenCookie, ORIGEN_COOKIE } from "@/lib/origen-registro";

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
    const plan = parsed.data.plan;
    const ahora = new Date();

    const creado = await prisma.user.create({
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
        // Los dos planes arrancan con período de prueba, de distinta
        // duración (ver `TRIAL_DIAS` en src/lib/plan.ts).
        plan,
        trialEndsAt: nuevaFechaFinTrial(plan),
        ...leerOrigenCookie(request.cookies.get(ORIGEN_COOKIE)?.value),
      },
      select: { email: true, nombre: true, apellido: true, tituloCortesia: true, plan: true },
    });

    // Igual que en /api/auth/recuperar: en producción los links del mail
    // salen de NEXT_PUBLIC_SITE_URL, nunca del header Host.
    const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;
    after(() => enviarMailBienvenida(creado, baseUrl));

    const respuesta = NextResponse.json({ ok: true }, { status: 201 });
    respuesta.cookies.delete(ORIGEN_COOKIE);
    return respuesta;
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return NextResponse.json({ error: "No se pudo crear la cuenta." }, { status: 500 });
  }
}
