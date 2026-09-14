import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { calcularDiffAnterior, registrarAuditoria } from "@/lib/audit-log";

type RouteParams = { params: Promise<{ id: string; evolucionId: string }> };

const evolucionInput = z.object({
  fecha: z.string().trim().min(1, "La fecha es obligatoria."),
  contenido: z.string().trim().min(1, "El contenido es obligatorio."),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
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

  const antes = await prisma.patientEvolucion.findFirst({
    where: { id: evolucionId, patientId: id, deletedAt: null, patient: { doctorId: tenantId } },
  });
  if (!antes) {
    return NextResponse.json({ error: "Evolución no encontrada." }, { status: 404 });
  }

  const nuevaFecha = new Date(parsed.data.fecha);
  await prisma.patientEvolucion.update({
    where: { id: evolucionId },
    data: { fecha: nuevaFecha, contenido: parsed.data.contenido },
  });

  const detalleAnterior = calcularDiffAnterior(antes, {
    fecha: nuevaFecha,
    contenido: parsed.data.contenido,
  });
  if (detalleAnterior) {
    await registrarAuditoria(prisma, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "MODIFICAR",
      entidad: "EVOLUCION",
      entidadId: evolucionId,
      detalleAnterior,
    });
  }

  const evolucion = await prisma.patientEvolucion.findUniqueOrThrow({
    where: { id: evolucionId },
  });

  return NextResponse.json({ evolucion });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, evolucionId } = await params;

  // Ley 26.529 art. 12/18: idem Patient.deletedAt -- una evolución nunca se
  // borra físicamente, solo se oculta.
  const result = await prisma.patientEvolucion.updateMany({
    where: { id: evolucionId, patientId: id, deletedAt: null, patient: { doctorId: tenantId } },
    data: { deletedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Evolución no encontrada." }, { status: 404 });
  }

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "ELIMINAR",
    entidad: "EVOLUCION",
    entidadId: evolucionId,
  });

  const evolucion = await prisma.patientEvolucion.findUniqueOrThrow({
    where: { id: evolucionId },
  });

  return NextResponse.json({ evolucion });
}
