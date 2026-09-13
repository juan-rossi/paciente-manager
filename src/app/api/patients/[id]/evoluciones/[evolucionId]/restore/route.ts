import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string; evolucionId: string }> };

export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, evolucionId } = await params;

  const result = await prisma.patientEvolucion.updateMany({
    where: {
      id: evolucionId,
      patientId: id,
      deletedAt: { not: null },
      patient: { doctorId: tenantId },
    },
    data: { deletedAt: null },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Evolución no encontrada." }, { status: 404 });
  }

  const evolucion = await prisma.patientEvolucion.findUniqueOrThrow({
    where: { id: evolucionId },
  });

  return NextResponse.json({ evolucion });
}
