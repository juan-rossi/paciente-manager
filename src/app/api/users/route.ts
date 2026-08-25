import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { secretaryInputSchema } from "@/lib/turno-schema";

export async function GET() {
  const { response } = await requireDoctor();
  if (response) return response;

  const secretarias = await prisma.user.findMany({
    where: { role: "SECRETARY" },
    select: { id: true, email: true, nombre: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ secretarias });
}

export async function POST(request: NextRequest) {
  const { response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = secretaryInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const secretaria = await prisma.user.create({
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      passwordHash,
      role: "SECRETARY",
    },
    select: { id: true, email: true, nombre: true, createdAt: true },
  });

  return NextResponse.json({ secretaria }, { status: 201 });
}
