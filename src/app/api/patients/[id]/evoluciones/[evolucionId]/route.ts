import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string; evolucionId: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireUser();
  if (response) return response;

  const { id, evolucionId } = await params;

  await prisma.patientEvolucion.deleteMany({
    where: { id: evolucionId, patientId: id },
  });

  return NextResponse.json({ ok: true });
}
