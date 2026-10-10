import { NextRequest, NextResponse } from "next/server";
import { restablecerSchema } from "@/lib/password-reset-schema";
import { restablecerPassword } from "@/lib/password-reset";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = restablecerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const resultado = await restablecerPassword(parsed.data.token, parsed.data.password);
  if (resultado === "invalido") {
    return NextResponse.json(
      { error: "El link venció o ya fue usado. Pedí uno nuevo." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
