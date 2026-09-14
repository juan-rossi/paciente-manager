import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { revocarConsentimientoSchema } from "@/lib/consentimiento-schema";
import { registrarAuditoria } from "@/lib/audit-log";

type RouteParams = { params: Promise<{ id: string; consentimientoId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, consentimientoId } = await params;

  const body = await request.json().catch(() => ({}));
  const parsed = revocarConsentimientoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Ley 26.529 art. 10: el paciente puede revocar su consentimiento en
  // cualquier momento -- la revocación deja constancia expresa (fecha +
  // motivo) sin tocar el contenido original del consentimiento otorgado.
  // Solo aplica a uno efectivamente OTORGADO: uno ya RECHAZADO no tiene
  // nada que revocar.
  const result = await prisma.consentimientoInformado.updateMany({
    where: {
      id: consentimientoId,
      patientId: id,
      deletedAt: null,
      revocadoEn: null,
      estado: "OTORGADO",
      patient: { doctorId: tenantId },
    },
    data: { revocadoEn: new Date(), revocadoMotivo: parsed.data.motivo },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Consentimiento no encontrado, ya revocado, o rechazado (nada que revocar)." },
      { status: 404 }
    );
  }

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "MODIFICAR",
    entidad: "CONSENTIMIENTO",
    entidadId: consentimientoId,
    detalleAnterior: { revocadoEn: null, revocadoMotivo: null },
  });

  const consentimiento = await prisma.consentimientoInformado.findUniqueOrThrow({
    where: { id: consentimientoId },
  });

  return NextResponse.json({ consentimiento });
}
