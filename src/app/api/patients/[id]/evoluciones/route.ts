import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const evolucionInput = z.object({
  fecha: z.string().trim().min(1, "La fecha es obligatoria."),
  contenido: z.string().trim().min(1, "El contenido es obligatorio."),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = evolucionInput.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const evolucion = await prisma.patientEvolucion.create({
    data: {
      patientId: id,
      fecha: new Date(parsed.data.fecha),
      contenido: parsed.data.contenido,
    },
  });

  return NextResponse.json({ evolucion }, { status: 201 });
}
