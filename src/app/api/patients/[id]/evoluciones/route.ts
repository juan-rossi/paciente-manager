import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { camposSesion, evolucionInput } from "@/lib/evolucion-schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor({ escritura: true });
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
      contenidoDictado: parsed.data.contenidoDictado ?? null,
      ...camposSesion(parsed.data),
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
