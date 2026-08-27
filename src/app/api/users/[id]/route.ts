import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { secretaryUpdateSchema } from "@/lib/turno-schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const existing = await prisma.user.findFirst({ where: { id, role: "SECRETARY" } });
  if (!existing) {
    return NextResponse.json({ error: "Secretaria no encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = secretaryUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (emailTaken) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
    }
  }

  const secretaria = await prisma.user.update({
    where: { id },
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
    },
    select: { id: true, email: true, nombre: true, createdAt: true },
  });

  return NextResponse.json({ secretaria });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  // Nunca se borra por esta vía a un usuario que no sea secretaria (p. ej. el médico).
  await prisma.user.deleteMany({ where: { id, role: "SECRETARY" } });

  return NextResponse.json({ ok: true });
}
