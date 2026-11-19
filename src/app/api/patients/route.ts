import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { patientSchema } from "@/lib/patient-schema";
import { findDniConflict } from "@/lib/dni-conflict";
import { registrarAuditoria } from "@/lib/audit-log";
import { tieneMarcas } from "@/lib/odontograma";
import { tenantEsOdontologo } from "@/lib/odontograma-server";

const listSelect = {
  id: true,
  nombreYApellido: true,
  nroDocumento: true,
  fechaNacimiento: true,
  telefono: true,
  updatedAt: true,
} satisfies Prisma.PatientSelect;

const RECIENTES = 20;

export async function GET(request: NextRequest) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q) {
    return NextResponse.json({ patients: await pacientesRecientes(user.id, tenantId) });
  }

  const patients = await prisma.patient.findMany({
    where: {
      doctorId: tenantId,
      deletedAt: null,
      OR: [
        { nroDocumento: { contains: q, mode: "insensitive" } },
        { nombreYApellido: { contains: q, mode: "insensitive" } },
      ],
    },
    select: listSelect,
    orderBy: { nombreYApellido: "asc" },
    take: 50,
  });

  return NextResponse.json({ patients });
}

// Sin filtro: los últimos pacientes cuyo detalle abrió este usuario (crear o
// editar también terminan en el detalle). Si todavía vio menos de
// `RECIENTES`, se completa con los últimos creados/editados del tenant.
async function pacientesRecientes(userId: string, tenantId: string) {
  const vistos = await prisma.pacienteVisto.findMany({
    where: { userId, patient: { doctorId: tenantId, deletedAt: null } },
    orderBy: { vistoAt: "desc" },
    take: RECIENTES,
    select: { patient: { select: listSelect } },
  });
  const patients = vistos.map((v) => v.patient);
  if (patients.length >= RECIENTES) return patients;

  const relleno = await prisma.patient.findMany({
    where: {
      doctorId: tenantId,
      deletedAt: null,
      id: { notIn: patients.map((p) => p.id) },
    },
    select: listSelect,
    orderBy: { updatedAt: "desc" },
    take: RECIENTES - patients.length,
  });
  return [...patients, ...relleno];
}

export async function POST(request: NextRequest) {
  const { user, tenantId, response } = await requireDoctor({ escritura: true });
  if (response) return response;

  const body = await request.json().catch(() => null);
  const resolveDniConflict = Boolean(
    body && typeof body === "object" && (body as Record<string, unknown>).resolveDniConflict
  );
  const parsed = patientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { antecedentes, evoluciones, odontogramaInicial, ...patientFields } = parsed.data;
  const guardarOdontograma =
    odontogramaInicial != null &&
    tieneMarcas(odontogramaInicial.datos) &&
    (await tenantEsOdontologo(tenantId));

  let conflict = null;
  if (patientFields.nroDocumento) {
    conflict = await findDniConflict(tenantId, patientFields.nroDocumento);
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
      // Al otro paciente se le quita el DNI: queda en su historial.
      await registrarAuditoria(tx, {
        doctorId: tenantId,
        actorId: user.id,
        accion: "MODIFICAR",
        entidad: "PACIENTE",
        entidadId: conflict.id,
        detalleAnterior: { nroDocumento: patientFields.nroDocumento },
      });
    }

    const created = await tx.patient.create({
      data: {
        ...patientFields,
        doctorId: tenantId,
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
        evoluciones: {
          create: evoluciones.map((e) => ({
            fecha: new Date(e.fecha),
            contenido: e.contenido,
            contenidoDictado: e.contenidoDictado,
          })),
        },
      },
    });

    await registrarAuditoria(tx, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "CREAR",
      entidad: "PACIENTE",
      entidadId: created.id,
    });

    if (guardarOdontograma && odontogramaInicial) {
      const odontograma = await tx.patientOdontograma.create({
        data: {
          patientId: created.id,
          tipo: "INICIAL",
          fecha: new Date(odontogramaInicial.fecha),
          nota: odontogramaInicial.nota ?? null,
          datos: odontogramaInicial.datos,
        },
      });
      await registrarAuditoria(tx, {
        doctorId: tenantId,
        actorId: user.id,
        accion: "CREAR",
        entidad: "ODONTOGRAMA",
        entidadId: odontograma.id,
      });
    }

    return created;
  });

  return NextResponse.json({ patient }, { status: 201 });
}
