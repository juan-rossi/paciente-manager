import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { lugarAgendaPublicaSchema } from "@/lib/perfil-schema";

type RouteParams = { params: Promise<{ id: string }> };

// Toggle instantáneo por lugar (mismo criterio que el de
// /api/perfil/agenda-publica): habilita o no que se puedan reservar turnos
// online en ese lugar puntual.
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = lugarAgendaPublicaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const existing = await prisma.lugarDeTrabajo.findFirst({
    where: { id, userId: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
  }

  const lugar = await prisma.lugarDeTrabajo.update({
    where: { id },
    data: { reservaPublicaHabilitada: parsed.data.reservaPublicaHabilitada },
    select: { id: true, reservaPublicaHabilitada: true, publicSlug: true },
  });

  return NextResponse.json({ lugar });
}
