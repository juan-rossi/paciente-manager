import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { serializeTurno } from "@/lib/turno-serialize";
import { turnoEditSchema } from "@/lib/turno-schema";

type RouteParams = { params: Promise<{ id: string }> };

const turnoUpdateSchema = z.union([z.object({ estado: z.literal("CANCELADO") }), turnoEditSchema]);

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = turnoUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if ("estado" in parsed.data) {
    const turno = await prisma.turno.update({
      where: { id },
      data: { estado: parsed.data.estado },
    });
    return NextResponse.json({ turno: serializeTurno(turno, user.role) });
  }

  const patient = await prisma.patient.findFirst({
    where: { nroDocumento: parsed.data.dni },
    select: { id: true },
  });

  const turno = await prisma.turno.update({
    where: { id },
    data: { ...parsed.data, patientId: patient?.id ?? null },
  });

  return NextResponse.json({ turno: serializeTurno(turno, user.role) });
}
