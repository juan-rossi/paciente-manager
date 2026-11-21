import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { calcularDiffAnterior, registrarAuditoria } from "@/lib/audit-log";
import { controlInput, datosControl } from "@/lib/controles";

type RouteParams = { params: Promise<{ id: string; controlId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor({ escritura: true });
  if (response) return response;

  const { id, controlId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = controlInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const antes = await prisma.patientControl.findFirst({
    where: { id: controlId, patientId: id, deletedAt: null, patient: { doctorId: tenantId, deletedAt: null } },
  });
  if (!antes) {
    return NextResponse.json({ error: "Control no encontrado." }, { status: 404 });
  }

  const datos = datosControl(parsed.data);
  const control = await prisma.patientControl.update({ where: { id: controlId }, data: datos });

  const detalleAnterior = calcularDiffAnterior(antes, datos);
  if (detalleAnterior) {
    await registrarAuditoria(prisma, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "MODIFICAR",
      entidad: "CONTROL",
      entidadId: controlId,
      detalleAnterior,
    });
  }

  return NextResponse.json({ control });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor({ escritura: true });
  if (response) return response;

  const { id, controlId } = await params;

  // Ley 26.529 art. 12/18: igual que una evolución, un control nunca se
  // borra físicamente, solo se oculta.
  const result = await prisma.patientControl.updateMany({
    where: { id: controlId, patientId: id, deletedAt: null, patient: { doctorId: tenantId, deletedAt: null } },
    data: { deletedAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Control no encontrado." }, { status: 404 });
  }

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "ELIMINAR",
    entidad: "CONTROL",
    entidadId: controlId,
  });

  return NextResponse.json({ ok: true });
}
