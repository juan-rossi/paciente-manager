import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { fotoPerfilSchema } from "@/lib/perfil-schema";
import { marcarPerfilPublicado, sincronizarCampoPublico } from "@/lib/moderacion";

// Tope generoso para el string base64 (incluye el overhead ~33% de la
// codificación) -- sin esto un archivo grande infla la fila de "User" sin
// límite. Bajarlo si en algún momento se migra a un storage externo.
const MAX_BASE64_LENGTH = 3_000_000; // ~2MB de imagen original

export async function POST(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = fotoPerfilSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Imagen inválida." }, { status: 400 });
  }

  if (parsed.data.fotoPerfil.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: "La imagen es demasiado grande (máx. 2MB)." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { fotoPerfilBase64: parsed.data.fotoPerfil },
  });

  // Solo la foto: la biografía no cambió, no se vuelve a moderar.
  const moderacion = await sincronizarCampoPublico(user.id, "FOTO");
  await marcarPerfilPublicado(user.id);

  return NextResponse.json({ ok: true, moderacion });
}

export async function DELETE() {
  const { user, response } = await requireDoctor();
  if (response) return response;

  await prisma.user.update({ where: { id: user.id }, data: { fotoPerfilBase64: null } });
  // Quitar la foto se publica directo (sin moderación).
  await sincronizarCampoPublico(user.id, "FOTO");
  await marcarPerfilPublicado(user.id);

  return NextResponse.json({ ok: true });
}
