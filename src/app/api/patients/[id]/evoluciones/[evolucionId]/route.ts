import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string; evolucionId: string }> };

const evolucionInput = z.object({
  fecha: z.string().trim().min(1, "La fecha es obligatoria."),
  contenido: z.string().trim().min(1, "El contenido es obligatorio."),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { response } = await requireDoctor();
  if (response) return response;

  const { id, evolucionId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = evolucionInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await prisma.patientEvolucion.updateMany({
    where: { id: evolucionId, patientId: id },
    data: {
      fecha: new Date(parsed.data.fecha),
      contenido: parsed.data.contenido,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Evolución no encontrada." }, { status: 404 });
  }

  const evolucion = await prisma.patientEvolucion.findUniqueOrThrow({
    where: { id: evolucionId },
  });

  return NextResponse.json({ evolucion });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireDoctor();
  if (response) return response;

  const { id, evolucionId } = await params;

  await prisma.patientEvolucion.deleteMany({
    where: { id: evolucionId, patientId: id },
  });

  return NextResponse.json({ ok: true });
}
