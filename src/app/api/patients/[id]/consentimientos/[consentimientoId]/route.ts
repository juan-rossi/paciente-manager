import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";

type RouteParams = { params: Promise<{ id: string; consentimientoId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, consentimientoId } = await params;

  // Ley 26.529 art. 12/18: idem Patient.deletedAt -- un consentimiento
  // informado nunca se borra físicamente, solo se oculta.
  const result = await prisma.consentimientoInformado.updateMany({
    where: {
      id: consentimientoId,
      patientId: id,
      deletedAt: null,
      patient: { doctorId: tenantId },
    },
    data: { deletedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Consentimiento no encontrado." }, { status: 404 });
  }

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "ELIMINAR",
    entidad: "CONSENTIMIENTO",
    entidadId: consentimientoId,
  });

  const consentimiento = await prisma.consentimientoInformado.findUniqueOrThrow({
    where: { id: consentimientoId },
  });

  return NextResponse.json({ consentimiento });
}
