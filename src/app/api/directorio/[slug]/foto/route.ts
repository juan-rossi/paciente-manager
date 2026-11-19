import { prisma } from "@/lib/prisma";
import { SIN_SANCION } from "@/lib/sanciones";
import { decodificarFotoGuardada } from "@/lib/imagen-perfil";

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
      OR: [{ perfilPublico: true, perfilPublicadoAt: { not: null } }, { reservaPublicaHabilitada: true }],
      ...SIN_SANCION,
    },
    select: { fotoPublicaBase64: true },
  });

  // Se sirve desde nuestro dominio: solo PNG/JPEG verificados por sus bytes,
  // con el MIME que corresponde a esos bytes (nunca el que vino guardado).
  // Un SVG o HTML acá ejecutaría scripts con la sesión de quien abra el link.
  const foto = decodificarFotoGuardada(doctor?.fotoPublicaBase64);
  if (!foto) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(foto.bytes), {
    headers: {
      "Content-Type": foto.mime,
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      // Defensa en profundidad si algún día se cuela otro tipo: el navegador
      // no adivina el tipo y, aunque lo renderizara, no corre scripts.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
