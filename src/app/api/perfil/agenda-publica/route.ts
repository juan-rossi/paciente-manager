import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { agendaPublicaSchema } from "@/lib/perfil-schema";
import { generateUniquePublicSlug } from "@/lib/public-slug";

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

  let publicSlug = user.publicSlug;
  if (parsed.data.reservaPublicaHabilitada && !publicSlug) {
    publicSlug = await generateUniquePublicSlug(user.nombre, user.apellido);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { reservaPublicaHabilitada: parsed.data.reservaPublicaHabilitada, publicSlug },
  });

  return NextResponse.json({
    reservaPublicaHabilitada: updated.reservaPublicaHabilitada,
    publicSlug: updated.publicSlug,
  });
}
