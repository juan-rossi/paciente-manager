import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { odontogramaInputSchema } from "@/lib/odontograma";
import { verificarAccesoOdontograma, YA_HAY_INICIAL } from "@/lib/odontograma-server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;
  const denied = await verificarAccesoOdontograma(tenantId, id);
  if (denied) return denied;

  const odontogramas = await prisma.patientOdontograma.findMany({
    where: { patientId: id, deletedAt: null },
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ odontogramas });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;
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

  if (parsed.data.tipo === "INICIAL") {
    const existe = await prisma.patientOdontograma.findFirst({
      where: { patientId: id, tipo: "INICIAL", deletedAt: null },
      select: { id: true },
    });
    if (existe) {
      return NextResponse.json({ error: YA_HAY_INICIAL }, { status: 409 });
    }
  }

  const odontograma = await prisma.patientOdontograma.create({
    data: {
      patientId: id,
      tipo: parsed.data.tipo,
      fecha: new Date(parsed.data.fecha),
      nota: parsed.data.nota ?? null,
      datos: parsed.data.datos,
    },
  });

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "CREAR",
    entidad: "ODONTOGRAMA",
    entidadId: odontograma.id,
  });

  return NextResponse.json({ odontograma }, { status: 201 });
}
