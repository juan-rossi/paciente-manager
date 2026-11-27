import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { coberturasSchema } from "@/lib/perfil-schema";

// Configuración > Coberturas. Reemplaza la lista completa de coberturas del
// médico (con su flag de teleconsulta) y el monto de la consulta particular.
export async function PUT(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = coberturasSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Un id que no está en el catálogo simplemente se descarta.
  const validos = new Set(
    (
      await prisma.prepaga.findMany({
        where: { id: { in: parsed.data.prepagas.map((p) => p.id) } },
        select: { id: true },
      })
    ).map((p) => p.id)
  );
  const prepagas = parsed.data.prepagas.filter((p) => validos.has(p.id));
  const ids = prepagas.map((p) => p.id);
  const sinTeleconsulta = prepagas.filter((p) => !p.aceptaTeleconsulta).map((p) => p.id);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { montoConsultaParticular: parsed.data.montoConsultaParticular },
    }),
    prisma.doctorPrepaga.deleteMany({
      where: { doctorId: user.id, prepagaId: { notIn: ids } },
    }),
    prisma.doctorPrepaga.createMany({
      data: prepagas.map((p) => ({
        doctorId: user.id,
        prepagaId: p.id,
        aceptaTeleconsulta: p.aceptaTeleconsulta,
      })),
      skipDuplicates: true,
    }),
    // Las que ya existían: createMany las saltea, así que el flag se fija acá.
    prisma.doctorPrepaga.updateMany({
      where: { doctorId: user.id, prepagaId: { in: sinTeleconsulta } },
      data: { aceptaTeleconsulta: false },
    }),
    prisma.doctorPrepaga.updateMany({
      where: { doctorId: user.id, prepagaId: { in: ids, notIn: sinTeleconsulta } },
      data: { aceptaTeleconsulta: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
