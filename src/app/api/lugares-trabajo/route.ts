import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { lugarTrabajoSchema } from "@/lib/lugar-trabajo-schema";

export async function GET() {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const lugares = await prisma.lugarDeTrabajo.findMany({
    where: { userId: tenantId },
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

  if (parsed.data.tipo === "PARTICULAR") {
    const existente = await prisma.lugarDeTrabajo.findFirst({
      where: { userId: tenantId, tipo: "PARTICULAR" },
    });
    if (existente) {
      return NextResponse.json({ error: "Ya tenés un lugar particular cargado." }, { status: 409 });
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
    },
  });

  return NextResponse.json({ lugar }, { status: 201 });
}
