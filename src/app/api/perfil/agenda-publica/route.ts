import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { agendaPublicaSchema } from "@/lib/perfil-schema";
import { generateUniquePublicSlug } from "@/lib/public-slug";
import { sincronizarCampoPublico } from "@/lib/moderacion";

// Toggle instantáneo (se guarda solo, sin pasar por "Guardar cambios") --
// mismo criterio que `sobreturnosHabilitados`/`mensajeriaHabilitada`.
export async function PATCH(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = agendaPublicaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { reservaPublicaHabilitada, reservaPublicaSemanas } = parsed.data;

  let publicSlug = user.publicSlug;
  if (reservaPublicaHabilitada && !publicSlug) {
    publicSlug = await generateUniquePublicSlug(user.nombre, user.apellido);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { reservaPublicaHabilitada, reservaPublicaSemanas, publicSlug },
  });

  // Al activar la agenda pública, todos los lugares arrancan con turnos online.
  if (reservaPublicaHabilitada) {
    await prisma.lugarDeTrabajo.updateMany({
      where: { userId: user.id, deletedAt: null },
      data: { reservaPublicaHabilitada: true },
    });
  }

  // La foto también se ve en la agenda pública: si nunca pasó por la
  // moderación (p.ej. se subió con todo lo público apagado), pasa ahora.
  const moderacionFoto = reservaPublicaHabilitada
    ? await sincronizarCampoPublico(user.id, "FOTO")
    : null;

  return NextResponse.json({
    moderacion: { foto: moderacionFoto },
    reservaPublicaHabilitada: updated.reservaPublicaHabilitada,
    reservaPublicaSemanas: updated.reservaPublicaSemanas,
    publicSlug: updated.publicSlug,
  });
}
