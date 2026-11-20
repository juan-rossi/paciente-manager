import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { verifyPassword } from "@/lib/auth";
import { rateLimitOk } from "@/lib/rate-limit";
import { solicitarCambioEmail } from "@/lib/cambio-email";
import { getSiteUrl } from "@/lib/site-url";

const cambioEmailInput = z.object({
  emailNuevo: z.string().trim().toLowerCase().min(1, "Ingresá el email nuevo.").email("Email inválido.").max(254),
  password: z.string().min(1, "Ingresá tu contraseña actual."),
});

// Pide cambiar el email propio (médico o asistente). El cambio recién se
// hace cuando se confirma con el link que llega al email nuevo (ver
// src/lib/cambio-email.ts). No depende del estado de la cuenta del médico
// activo: es la cuenta de la persona.
export async function POST(request: NextRequest) {
  const { user, response } = await requireUser({ validarCuenta: false });
  if (response) return response;
  if (user.role !== "DOCTOR" && user.role !== "SECRETARY") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  if (!(await rateLimitOk(`user:${user.id}`, user.id, "cambio-email"))) {
    return NextResponse.json(
      { error: "Hiciste varios pedidos seguidos. Esperá un rato y volvé a intentar." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = cambioEmailInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }
  const { emailNuevo, password } = parsed.data;

  // Una cuenta creada con Google no tiene contraseña: no hay con qué
  // confirmar que es la dueña la que pide el cambio desde esta sesión.
  if (!user.passwordHash) {
    return NextResponse.json(
      {
        error:
          "Tu cuenta no tiene contraseña (entrás con Google). Creá una desde \"¿Olvidaste tu contraseña?\" en la pantalla de ingreso y volvé a intentar.",
      },
      { status: 400 }
    );
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
  }
  if (emailNuevo === user.email) {
    return NextResponse.json({ error: "Ese ya es tu email." }, { status: 400 });
  }

  const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;
  try {
    await solicitarCambioEmail(user, emailNuevo, baseUrl);
  } catch (error) {
    console.error("[cuenta/email] no se pudo enviar el mail", error);
    return NextResponse.json({ error: "No pudimos enviar el mail. Probá de nuevo en unos minutos." }, { status: 502 });
  }

  // Misma respuesta exista o no una cuenta con ese email.
  return NextResponse.json({ ok: true });
}
