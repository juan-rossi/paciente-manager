import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { consentimientoSchema } from "@/lib/consentimiento-schema";
import { registrarAuditoria } from "@/lib/audit-log";

type RouteParams = { params: Promise<{ id: string }> };

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
  const parsed = consentimientoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const consentimiento = await prisma.consentimientoInformado.create({
    data: {
      patientId: id,
      procedimiento: parsed.data.procedimiento,
      riesgosBeneficios: parsed.data.riesgosBeneficios,
      alternativas: parsed.data.alternativas,
      tipo: parsed.data.tipo,
      estado: parsed.data.estado,
      fecha: new Date(parsed.data.fecha),
    },
  });

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "CREAR",
    entidad: "CONSENTIMIENTO",
    entidadId: consentimiento.id,
  });

  return NextResponse.json({ consentimiento }, { status: 201 });
}
