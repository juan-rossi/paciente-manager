import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";

type RouteParams = { params: Promise<{ id: string }> };

const evolucionInput = z.object({
  fecha: z.string().trim().min(1, "La fecha es obligatoria."),
  contenido: z.string().trim().min(1, "El contenido es obligatorio."),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const owned = await prisma.patient.findFirst({
    where: { id, doctorId: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
  }

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

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "CREAR",
    entidad: "EVOLUCION",
    entidadId: evolucion.id,
  });

  return NextResponse.json({ evolucion }, { status: 201 });
}
