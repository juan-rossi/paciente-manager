import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmarCambioEmail } from "@/lib/cambio-email";

const confirmarInput = z.object({ token: z.string().min(1).max(200) });

// Lo llama el botón de /confirmar-email (no el link del mail en sí: un GET
// que cambia algo lo dispararían los antivirus que abren los links). No
// requiere sesión: el token, que llegó solo a la casilla nueva, es la prueba.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = confirmarInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "El link no es válido." }, { status: 400 });
  }

  const resultado = await confirmarCambioEmail(parsed.data.token);
  if (resultado === "en-uso") {
    return NextResponse.json(
      { error: "Ese email ya está en uso por otra cuenta. Pedí el cambio de nuevo con otro email." },
      { status: 409 }
    );
  }
  if (resultado === "invalido") {
    return NextResponse.json(
      { error: "El link venció o ya se usó. Pedí el cambio de nuevo desde tu cuenta." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}
