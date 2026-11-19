import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { tenantEsOdontologo } from "@/lib/odontograma-server";
import { arancelInputSchema } from "@/lib/presupuesto";

// Aranceles particulares del odontólogo por práctica del nomenclador. Los
// carga el médico en Configuración y prellenan los montos del presupuesto.

async function soloOdontologos(tenantId: string) {
  if (await tenantEsOdontologo(tenantId)) return null;
  return NextResponse.json(
    { error: "Los aranceles solo están disponibles para especialidades odontológicas." },
    { status: 403 }
  );
}

export async function GET() {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;
  const denied = await soloOdontologos(tenantId);
  if (denied) return denied;

  const aranceles = await prisma.doctorArancelPractica.findMany({
    where: { doctorId: tenantId },
    select: { practicaId: true, monto: true },
  });
  return NextResponse.json({ aranceles });
}

// Guarda (o borra, con monto null) el arancel de una práctica.
export async function PUT(request: NextRequest) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;
  const denied = await soloOdontologos(tenantId);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = arancelInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { practicaId, monto } = parsed.data;

  if (monto === null) {
    await prisma.doctorArancelPractica.deleteMany({ where: { doctorId: tenantId, practicaId } });
    return NextResponse.json({ arancel: null });
  }

  const practica = await prisma.practicaOdontologica.findFirst({
    where: { id: practicaId, activo: true },
    select: { id: true },
  });
  if (!practica) {
    return NextResponse.json({ error: "La práctica no existe en el nomenclador." }, { status: 400 });
  }

  const arancel = await prisma.doctorArancelPractica.upsert({
    where: { doctorId_practicaId: { doctorId: tenantId, practicaId } },
    create: { doctorId: tenantId, practicaId, monto },
    update: { monto },
    select: { practicaId: true, monto: true },
  });
  return NextResponse.json({ arancel });
}
