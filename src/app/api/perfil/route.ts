import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { perfilSchema } from "@/lib/perfil-schema";
import { generateUniquePublicSlug } from "@/lib/public-slug";

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = perfilSchema.safeParse(body);

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
      ? await generateUniquePublicSlug(parsed.data.nombre, parsed.data.apellido)
      : user.publicSlug;

  const visibles = parsed.data.lugaresVisibles;
  // Un id que no está en el catálogo simplemente se descarta.
  const prepagaIds = (
    await prisma.prepaga.findMany({
      where: { id: { in: parsed.data.prepagaIds } },
      select: { id: true },
    })
  ).map((p) => p.id);
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        tituloCortesia: parsed.data.tituloCortesia,
        nombre: parsed.data.nombre,
        apellido: parsed.data.apellido,
        especialidad: parsed.data.especialidad,
        nroMatricula: parsed.data.nroMatricula,
        perfilPublico: parsed.data.perfilPublico,
        biografia: parsed.data.biografia,
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
    prisma.doctorPrepaga.deleteMany({
      where: { doctorId: user.id, prepagaId: { notIn: prepagaIds } },
    }),
    prisma.doctorPrepaga.createMany({
      data: prepagaIds.map((prepagaId) => ({ doctorId: user.id, prepagaId })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({
    tituloCortesia: updated.tituloCortesia,
    nombre: updated.nombre,
    apellido: updated.apellido,
    especialidad: updated.especialidad,
    nroMatricula: updated.nroMatricula,
    perfilPublico: updated.perfilPublico,
    biografia: updated.biografia,
    publicSlug: updated.publicSlug,
  });
}
