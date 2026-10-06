import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Sirve la foto de perfil del médico como imagen real (la guardamos como data
// URL) para poder usarla en `og:image` al compartir el perfil público: los
// crawlers (WhatsApp, etc.) no aceptan data URLs.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doctor = await prisma.user.findFirst({
    where: {
      role: "DOCTOR",
      publicSlug: slug,
      OR: [{ perfilPublico: true }, { reservaPublicaHabilitada: true }],
    },
    select: { fotoPerfilBase64: true },
  });

  const match = doctor?.fotoPerfilBase64?.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i);
  if (!match) return new Response(null, { status: 404 });

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
