import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { patientSchema } from "@/lib/patient-schema";
import { findDniConflict } from "@/lib/dni-conflict";

const patientUpdateSchema = patientSchema.omit({ evoluciones: true });

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      antecedentes: true,
      evoluciones: { orderBy: { fecha: "asc" } },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ patient });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  await prisma.patient.deleteMany({ where: { id } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

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
    conflict = await findDniConflict(patientFields.nroDocumento, id);
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

    await tx.patientAntecedente.deleteMany({ where: { patientId: id } });

    return tx.patient.update({
      where: { id },
      data: {
        ...patientFields,
        antecedentes: {
          create: antecedentes
            .filter((a) => a.respuesta)
            .map((a) => ({
              tipo: a.tipo,
              respuesta: a.respuesta,
              descripcion: a.descripcion,
              fechaInicio: a.fechaInicio,
              medicacion: a.medicacion,
              resolucion: a.resolucion,
            })),
        },
      },
      include: { antecedentes: true, evoluciones: { orderBy: { fecha: "desc" } } },
    });
  });

  return NextResponse.json({ patient });
}
