import { NextRequest, NextResponse } from "next/server";
import { recuperarSchema } from "@/lib/password-reset-schema";
import { solicitarRestablecimiento } from "@/lib/password-reset";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getSiteUrl } from "@/lib/site-url";

// Respuesta idéntica exista o no la cuenta -- si distinguiera, cualquiera
// podría usar este endpoint para averiguar qué emails son médicos de Semio 360.
const RESPUESTA_OK = { ok: true };

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = recuperarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { email } = parsed.data;
  const ip = getClientIp(request);

  if (!(await rateLimitOk(ip, email, "recuperar"))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

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

  // En producción el link sale siempre de NEXT_PUBLIC_SITE_URL y nunca del
  // header Host del request -- si no, alguien podría pedir un reset con un
  // Host falso y hacer que el mail apunte a su propio dominio.
  const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;

  try {
    await solicitarRestablecimiento(email, baseUrl);
  } catch (error) {
    console.error("[recuperar] no se pudo enviar el mail", error);
    return NextResponse.json(
      { error: "No pudimos enviar el mail. Probá de nuevo en unos minutos." },
      { status: 500 }
    );
  }

  return NextResponse.json(RESPUESTA_OK);
}
