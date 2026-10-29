import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// Ver `bonificado` en el schema: solo saca al médico de las métricas
// económicas, no le cambia el acceso.
const bonificadoInput = z.object({ bonificado: z.boolean() });

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = bonificadoInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { id, role: "DOCTOR" }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }

  const doctor = await prisma.user.update({
    where: { id },
    data: { bonificado: parsed.data.bonificado },
    select: { bonificado: true },
  });
  return NextResponse.json({ bonificado: doctor.bonificado });
}
