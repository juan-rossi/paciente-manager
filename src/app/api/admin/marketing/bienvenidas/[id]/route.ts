import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const publicarSchema = z.object({ genero: z.enum(["MASCULINO", "FEMENINO"]) });

// Marca la placa de bienvenida del médico como publicada en redes.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const parsed = publicarSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Elegí Bienvenido o Bienvenida." }, { status: 400 });
  }

  const medico = await prisma.user.findFirst({
    where: { id, role: "DOCTOR" },
    select: { id: true },
  });
  if (!medico) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }

  await prisma.marketingBienvenida.upsert({
    where: { doctorId: id },
    create: { doctorId: id, genero: parsed.data.genero, publicadaPorId: user.id },
    update: { genero: parsed.data.genero, publicadaPorId: user.id, publicadaAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

// Deshace la publicación: el médico vuelve a la lista de pendientes.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  await prisma.marketingBienvenida.deleteMany({ where: { doctorId: id } });
  return NextResponse.json({ ok: true });
}
