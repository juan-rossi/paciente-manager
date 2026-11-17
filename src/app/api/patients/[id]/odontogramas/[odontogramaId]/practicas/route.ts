import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { verificarAccesoOdontograma } from "@/lib/odontograma-server";
import {
  ordenarCaras,
  practicaVisitaFromDb,
  practicaVisitaInputSchema,
} from "@/lib/practica-odontologica";

type RouteParams = { params: Promise<{ id: string; odontogramaId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, odontogramaId } = await params;
  const denied = await verificarAccesoOdontograma(tenantId, id);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = practicaVisitaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const visita = await prisma.patientOdontograma.findFirst({
    where: { id: odontogramaId, patientId: id, deletedAt: null },
    select: { id: true },
  });
  if (!visita) {
    return NextResponse.json({ error: "Visita no encontrada." }, { status: 404 });
  }

  const practica = await prisma.practicaOdontologica.findFirst({
    where: { id: parsed.data.practicaId, activo: true },
    select: { id: true, codigo: true, descripcion: true },
  });
  if (!practica) {
    return NextResponse.json(
      { error: "La práctica no existe en el nomenclador." },
      { status: 400 }
    );
  }

  const creada = await prisma.$transaction(async (tx) => {
    const fila = await tx.odontogramaPractica.create({
      data: {
        odontogramaId,
        practicaId: practica.id,
        pieza: parsed.data.pieza,
        caras: ordenarCaras(parsed.data.caras),
        codigo: practica.codigo,
        descripcion: practica.descripcion,
      },
    });
    await registrarAuditoria(tx, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "CREAR",
      entidad: "PRACTICA_ODONTOLOGICA",
      entidadId: fila.id,
    });
    return fila;
  });

  return NextResponse.json({ practica: practicaVisitaFromDb(creada) }, { status: 201 });
}
