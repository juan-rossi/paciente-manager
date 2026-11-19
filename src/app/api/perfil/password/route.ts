import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { passwordChangeSchema } from "@/lib/perfil-schema";
import { hashPassword, verifyPassword } from "@/lib/auth";

// Médico (Configuración → Seguridad) o secretaria (/mi-cuenta): es la
// contraseña de la persona, no depende del estado de la cuenta del médico.
export async function POST(request: NextRequest) {
  const { user, response } = await requireUser({ validarCuenta: false });
  if (response) return response;
  if (user.role !== "DOCTOR" && user.role !== "SECRETARY") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = passwordChangeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const valid = await verifyPassword(parsed.data.passwordActual, dbUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.passwordNueva);
  // Cierra TODAS las sesiones (ver `sessionVersion` en el callback `jwt` de
  // src/auth.ts): quien cambia la contraseña porque sospecha de una sesión
  // ajena -- una PC compartida, una cookie robada -- tiene que poder
  // cortarla. Incluye la actual: el cliente lo manda a ingresar de nuevo.
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
