import { NextRequest, NextResponse } from "next/server";
import { activarInvitacionSchema } from "@/lib/invitacion-secretaria-shared";
import { activarConPassword } from "@/lib/invitacion-secretaria";

// Pública (sin sesión): la secretaria invitada elige su contraseña desde el
// link del mail. El token es la prueba de que es dueña del email.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = activarInvitacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  const resultado = await activarConPassword(parsed.data.token, parsed.data.nombre, parsed.data.password);
  if (resultado === "invalido") {
    return NextResponse.json(
      { error: "La invitación venció o ya fue usada. Pedile a quien te invitó que te la reenvíe." },
      { status: 400 }
    );
  }
  if (resultado === "ya-tiene-password") {
    return NextResponse.json(
      { error: "Tu cuenta ya tiene una contraseña: ingresá con ella para aceptar la invitación." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
