import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { calcularDiffAnterior, registrarAuditoria } from "@/lib/audit-log";
import { odontogramaInputSchema } from "@/lib/odontograma";
import { verificarAccesoOdontograma, YA_HAY_INICIAL } from "@/lib/odontograma-server";

type RouteParams = { params: Promise<{ id: string; odontogramaId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, odontogramaId } = await params;
  const denied = await verificarAccesoOdontograma(tenantId, id);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = odontogramaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const antes = await prisma.patientOdontograma.findFirst({
    where: { id: odontogramaId, patientId: id, deletedAt: null },
  });
  if (!antes) {
    return NextResponse.json({ error: "Odontograma no encontrado." }, { status: 404 });
  }

  if (parsed.data.tipo === "INICIAL" && antes.tipo !== "INICIAL") {
    const existe = await prisma.patientOdontograma.findFirst({
      where: { patientId: id, tipo: "INICIAL", deletedAt: null, id: { not: odontogramaId } },
      select: { id: true },
    });
    if (existe) {
      return NextResponse.json({ error: YA_HAY_INICIAL }, { status: 409 });
    }
  }

  const despues = {
    tipo: parsed.data.tipo,
    fecha: new Date(parsed.data.fecha),
    nota: parsed.data.nota ?? null,
    datos: parsed.data.datos,
  };

  const odontograma = await prisma.patientOdontograma.update({
    where: { id: odontogramaId },
    data: despues,
  });

  // Ley 26.529 art. 13: se guarda el estado anterior de lo que cambió.
  const detalleAnterior = calcularDiffAnterior(antes as Record<string, unknown>, despues);
  if (detalleAnterior) {
    await registrarAuditoria(prisma, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "MODIFICAR",
      entidad: "ODONTOGRAMA",
      entidadId: odontogramaId,
      detalleAnterior,
    });
  }

  return NextResponse.json({ odontograma });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, odontogramaId } = await params;
  const denied = await verificarAccesoOdontograma(tenantId, id);
  if (denied) return denied;

  // Igual que las evoluciones: nunca se borra físicamente, solo se oculta.
  const result = await prisma.patientOdontograma.updateMany({
    where: { id: odontogramaId, patientId: id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Odontograma no encontrado." }, { status: 404 });
  }

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "ELIMINAR",
    entidad: "ODONTOGRAMA",
    entidadId: odontogramaId,
  });

  return NextResponse.json({ ok: true });
}
