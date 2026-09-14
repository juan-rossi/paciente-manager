import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { patientSchema } from "@/lib/patient-schema";
import { findDniConflict } from "@/lib/dni-conflict";
import { registrarAuditoria } from "@/lib/audit-log";

const patientUpdateSchema = patientSchema.omit({ evoluciones: true });

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const patient = await prisma.patient.findFirst({
    where: { id, doctorId: tenantId, deletedAt: null },
    include: {
      antecedentes: true,
      evoluciones: { where: { deletedAt: null }, orderBy: { fecha: "asc" } },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ patient });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  // Ley 26.529 art. 12/18: nunca se borra la historia clínica físicamente,
  // solo se oculta -- ver nota en prisma/schema.prisma sobre Patient.deletedAt.
  const result = await prisma.patient.updateMany({
    where: { id, doctorId: tenantId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  if (result.count > 0) {
    await registrarAuditoria(prisma, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "ELIMINAR",
      entidad: "PACIENTE",
      entidadId: id,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
  const resolveDniConflict = Boolean(
    body && typeof body === "object" && (body as Record<string, unknown>).resolveDniConflict
  );
  const parsed = patientUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { antecedentes, ...patientFields } = parsed.data;

  let conflict = null;
  if (patientFields.nroDocumento) {
    conflict = await findDniConflict(tenantId, patientFields.nroDocumento, id);
    if (conflict && !resolveDniConflict) {
      return NextResponse.json(
        {
          error: `El DNI ${patientFields.nroDocumento} ya está asignado a otro paciente.`,
          dniConflict: conflict,
        },
        { status: 409 }
      );
    }
  }

  const patient = await prisma.$transaction(async (tx) => {
    if (conflict && resolveDniConflict) {
      await tx.patient.update({ where: { id: conflict.id }, data: { nroDocumento: null } });
    }

    // Ley 26.529 art. 12: nunca se borran los antecedentes al editar un
    // paciente -- se actualiza cada tipo in place (upsert) en vez del
    // borrado-y-recreado de antes, que perdía silenciosamente el registro
    // (fechaInicio/medicacion/resolucion) de cualquier antecedente
    // desmarcado en una edición posterior.
    for (const a of antecedentes) {
      await tx.patientAntecedente.upsert({
        where: { patientId_tipo: { patientId: id, tipo: a.tipo } },
        create: {
          patientId: id,
          tipo: a.tipo,
          respuesta: a.respuesta,
          descripcion: a.descripcion,
          fechaInicio: a.fechaInicio,
          medicacion: a.medicacion,
          resolucion: a.resolucion,
        },
        update: {
          respuesta: a.respuesta,
          descripcion: a.descripcion,
          fechaInicio: a.fechaInicio,
          medicacion: a.medicacion,
          resolucion: a.resolucion,
        },
      });
    }

    const updated = await tx.patient.update({
      where: { id },
      data: patientFields,
      include: { antecedentes: true, evoluciones: { where: { deletedAt: null }, orderBy: { fecha: "desc" } } },
    });

    await registrarAuditoria(tx, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "MODIFICAR",
      entidad: "PACIENTE",
      entidadId: id,
    });

    return updated;
  });

  return NextResponse.json({ patient });
}
