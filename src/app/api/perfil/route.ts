import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { perfilSchema } from "@/lib/perfil-schema";

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
      },
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
  });
}
