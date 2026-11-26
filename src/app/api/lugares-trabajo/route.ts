import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { lugarTrabajoSchema } from "@/lib/lugar-trabajo-schema";
import { slugParaLugarNuevo } from "@/lib/public-slug";
import { teleconsultaHabilitada } from "@/lib/feature-flags";
import { mensajeLugarDuplicado } from "@/lib/lugar-tipo";

export async function GET() {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const lugares = await prisma.lugarDeTrabajo.findMany({
    where: { userId: tenantId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ lugares });
}

export async function POST(request: NextRequest) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = lugarTrabajoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.tipo === "VIRTUAL" && !teleconsultaHabilitada()) {
    return NextResponse.json({ error: "La teleconsulta no está disponible." }, { status: 403 });
  }

  // Solo puede haber un lugar particular y una teleconsulta por médico.
  if (parsed.data.tipo === "PARTICULAR" || parsed.data.tipo === "VIRTUAL") {
    const existente = await prisma.lugarDeTrabajo.findFirst({
      where: { userId: tenantId, tipo: parsed.data.tipo, deletedAt: null },
    });
    if (existente) {
      return NextResponse.json({ error: mensajeLugarDuplicado(parsed.data.tipo) }, { status: 409 });
    }
  }

  const lugar = await prisma.lugarDeTrabajo.create({
    data: {
      userId: tenantId,
      tipo: parsed.data.tipo,
      nombre: parsed.data.nombre,
      direccion: parsed.data.direccion,
      telefono: parsed.data.telefono,
      latitud: parsed.data.latitud ?? null,
      longitud: parsed.data.longitud ?? null,
      ciudad: parsed.data.ciudad ?? null,
      publicSlug: await slugParaLugarNuevo(tenantId, parsed.data.nombre ?? null),
    },
  });

  return NextResponse.json({ lugar }, { status: 201 });
}
