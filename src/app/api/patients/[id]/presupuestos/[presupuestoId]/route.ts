import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { verificarAccesoOdontograma } from "@/lib/odontograma-server";
import { presupuestoEstadoInputSchema } from "@/lib/presupuesto";

type RouteParams = { params: Promise<{ id: string; presupuestoId: string }> };

// Lo único que cambia de un presupuesto es su estado (aceptado o rechazado
// por el paciente): los ítems no se editan, se arma uno nuevo.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, presupuestoId } = await params;
  const denied = await verificarAccesoOdontograma(tenantId, id);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = presupuestoEstadoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const actual = await prisma.presupuestoOdontologico.findFirst({
    where: { id: presupuestoId, patientId: id, deletedAt: null },
    select: { estado: true },
  });
  if (!actual) {
    return NextResponse.json({ error: "Presupuesto no encontrado." }, { status: 404 });
  }
  if (actual.estado === parsed.data.estado) {
    return NextResponse.json({ estado: actual.estado });
  }

  await prisma.$transaction(async (tx) => {
    await tx.presupuestoOdontologico.update({
      where: { id: presupuestoId },
      data: { estado: parsed.data.estado },
    });
    await registrarAuditoria(tx, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "MODIFICAR",
      entidad: "PRESUPUESTO",
      entidadId: presupuestoId,
      detalleAnterior: { estado: actual.estado },
    });
  });

  return NextResponse.json({ estado: parsed.data.estado });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, presupuestoId } = await params;
  const denied = await verificarAccesoOdontograma(tenantId, id);
  if (denied) return denied;

  // Igual que los odontogramas: nunca se borra físicamente, solo se oculta.
  const result = await prisma.presupuestoOdontologico.updateMany({
    where: { id: presupuestoId, patientId: id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Presupuesto no encontrado." }, { status: 404 });
  }

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "ELIMINAR",
    entidad: "PRESUPUESTO",
    entidadId: presupuestoId,
  });

  return NextResponse.json({ ok: true });
}
