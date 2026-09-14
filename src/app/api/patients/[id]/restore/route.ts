import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const result = await prisma.patient.updateMany({
    where: { id, doctorId: tenantId, deletedAt: { not: null } },
    data: { deletedAt: null },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
  }

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "RESTAURAR",
    entidad: "PACIENTE",
    entidadId: id,
  });

  return NextResponse.json({ ok: true });
}
