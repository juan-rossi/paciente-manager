import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { visibilidadSchema } from "@/lib/perfil-schema";
import { generateUniquePublicSlug } from "@/lib/public-slug";
import { sincronizarCampoPublico } from "@/lib/moderacion";
import { RED_SOCIAL_CAMPO, REDES_SOCIALES, redesDeUsuario } from "@/lib/redes-sociales";

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = visibilidadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // El slug del directorio se genera la primera vez que el perfil se hace
  // público (si todavía no existe, p.ej. porque nunca se habilitó la agenda
  // pública tampoco) -- después queda fijo, igual que en el toggle de
  // agenda pública.
  const publicSlug =
    parsed.data.perfilPublico && !user.publicSlug
      ? await generateUniquePublicSlug(user.nombre, user.apellido)
      : user.publicSlug;

  const visibles = parsed.data.lugaresVisibles;
  const redes = Object.fromEntries(
    REDES_SOCIALES.map((red) => [RED_SOCIAL_CAMPO[red], parsed.data.redes[red]])
  );
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        perfilPublico: parsed.data.perfilPublico,
        biografia: parsed.data.biografia,
        ...redes,
        publicSlug,
      },
    }),
    // Solo toca lugares de este médico: un id ajeno en `lugaresVisibles`
    // simplemente no matchea nada.
    prisma.lugarDeTrabajo.updateMany({
      where: { userId: user.id, id: { in: visibles } },
      data: { perfilVisible: true },
    }),
    prisma.lugarDeTrabajo.updateMany({
      where: { userId: user.id, id: { notIn: visibles } },
      data: { perfilVisible: false },
    }),
  ]);

  // Solo llega a la API lo que difiere de lo ya publicado: la biografía si se
  // editó, la foto si el perfil recién se hace público con una foto nueva. En
  // serie, no con Promise.all: en paralelo, la base local de `prisma dev`
  // (una sola conexión) mezclaba las queries y el create fallaba.
  const moderacionBiografia = await sincronizarCampoPublico(user.id, "BIOGRAFIA");
  const moderacionFoto = await sincronizarCampoPublico(user.id, "FOTO");

  return NextResponse.json({
    moderacion: { biografia: moderacionBiografia, foto: moderacionFoto },
    perfilPublico: updated.perfilPublico,
    biografia: updated.biografia,
    // Ya normalizadas: el form las reemplaza para mostrar lo que se guardó.
    redes: redesDeUsuario(updated),
    publicSlug: updated.publicSlug,
  });
}
