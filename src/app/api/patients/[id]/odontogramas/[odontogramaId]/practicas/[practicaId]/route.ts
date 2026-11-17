import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { verificarAccesoOdontograma } from "@/lib/odontograma-server";

type RouteParams = {
  params: Promise<{ id: string; odontogramaId: string; practicaId: string }>;
};

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, odontogramaId, practicaId } = await params;
  const denied = await verificarAccesoOdontograma(tenantId, id);
  if (denied) return denied;

  // Igual que el resto de la HC: nunca se borra físicamente, solo se oculta.
  // El filtro por visita y paciente evita tocar una práctica de otro tenant.
  const eliminada = await prisma.$transaction(async (tx) => {
    const result = await tx.odontogramaPractica.updateMany({
      where: {
        id: practicaId,
        odontogramaId,
        deletedAt: null,
        odontograma: { patientId: id, deletedAt: null },
      },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) return false;
    await registrarAuditoria(tx, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "ELIMINAR",
      entidad: "PRACTICA_ODONTOLOGICA",
      entidadId: practicaId,
    });
    return true;
  });

  if (!eliminada) {
    return NextResponse.json({ error: "Práctica no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
