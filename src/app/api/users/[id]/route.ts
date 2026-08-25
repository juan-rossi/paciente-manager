import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  // Nunca se borra por esta vía a un usuario que no sea secretaria (p. ej. el médico).
  await prisma.user.deleteMany({ where: { id, role: "SECRETARY" } });

  return NextResponse.json({ ok: true });
}
