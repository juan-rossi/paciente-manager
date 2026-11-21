import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { controlInput, datosControl } from "@/lib/controles";

type RouteParams = { params: Promise<{ id: string }> };

// Controles con fecha (peso, presión, talla...). Son historia clínica: solo
// el médico (requireDoctor), nunca el asistente.
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
  const parsed = controlInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const control = await prisma.patientControl.create({
    data: { patientId: id, ...datosControl(parsed.data) },
  });

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "CREAR",
    entidad: "CONTROL",
    entidadId: control.id,
  });

  return NextResponse.json({ control }, { status: 201 });
}
