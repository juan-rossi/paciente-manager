import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { verificarAccesoOdontograma } from "@/lib/odontograma-server";
import { ordenarCaras } from "@/lib/practica-odontologica";
import { presupuestoFromDb, presupuestoInputSchema } from "@/lib/presupuesto";

type RouteParams = { params: Promise<{ id: string }> };

const INCLUDE_ITEMS = { items: true } as const;

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;
  const denied = await verificarAccesoOdontograma(tenantId, id);
  if (denied) return denied;

  const presupuestos = await prisma.presupuestoOdontologico.findMany({
    where: { patientId: id },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    include: INCLUDE_ITEMS,
  });
  return NextResponse.json({ presupuestos: presupuestos.map(presupuestoFromDb) });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor({ escritura: true });
  if (response) return response;

  const { id } = await params;
  const denied = await verificarAccesoOdontograma(tenantId, id);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = presupuestoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Código y descripción se copian del nomenclador (no se confía en el cliente).
  const practicaIds = [...new Set(parsed.data.items.map((i) => i.practicaId))];
  const practicas = await prisma.practicaOdontologica.findMany({
    where: { id: { in: practicaIds }, activo: true },
    select: { id: true, codigo: true, descripcion: true },
  });
  const porId = new Map(practicas.map((p) => [p.id, p]));
  if (porId.size !== practicaIds.length) {
    return NextResponse.json(
      { error: "Alguna práctica no existe en el nomenclador." },
      { status: 400 }
    );
  }

  const creado = await prisma.$transaction(async (tx) => {
    const presupuesto = await tx.presupuestoOdontologico.create({
      data: {
        patientId: id,
        fecha: new Date(`${parsed.data.fecha}T00:00:00.000Z`),
        nota: parsed.data.nota?.trim() || null,
        items: {
          create: parsed.data.items.map((item, orden) => {
            const practica = porId.get(item.practicaId)!;
            return {
              practicaId: practica.id,
              codigo: practica.codigo,
              descripcion: practica.descripcion,
              pieza: item.pieza,
              caras: ordenarCaras(item.caras),
              monto: item.monto,
              orden,
            };
          }),
        },
      },
      include: INCLUDE_ITEMS,
    });
    await registrarAuditoria(tx, {
      doctorId: tenantId,
      actorId: user.id,
      accion: "CREAR",
      entidad: "PRESUPUESTO",
      entidadId: presupuesto.id,
    });
    return presupuesto;
  });

  return NextResponse.json({ presupuesto: presupuestoFromDb(creado) }, { status: 201 });
}
