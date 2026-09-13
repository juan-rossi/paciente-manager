import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { serializeTurno } from "@/lib/turno-serialize";
import { turnoEditSchema } from "@/lib/turno-schema";

type RouteParams = { params: Promise<{ id: string }> };

const turnoUpdateSchema = z.union([z.object({ estado: z.literal("CANCELADO") }), turnoEditSchema]);

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireUser();
  if (response) return response;

  const { id } = await params;

  const owned = await prisma.turno.findFirst({ where: { id, doctorId: tenantId }, select: { id: true } });
  if (!owned) {
    return NextResponse.json({ error: "Turno no encontrado." }, { status: 404 });
  }

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

  const patient = parsed.data.dni
    ? await prisma.patient.findFirst({
        where: { doctorId: tenantId, nroDocumento: parsed.data.dni, deletedAt: null },
        select: { id: true },
      })
    : null;

  const turno = await prisma.turno.update({
    where: { id },
    data: { ...parsed.data, patientId: patient?.id ?? null },
  });

  return NextResponse.json({ turno: serializeTurno(turno, user.role) });
}
