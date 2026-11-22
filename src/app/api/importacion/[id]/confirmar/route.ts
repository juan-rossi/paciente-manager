import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// El médico revisó lo que cargó el equipo y confirma que está bien.
export async function POST(_request: Request, { params }: RouteParams) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;
  const { count } = await prisma.importacionHC.updateMany({
    where: { id, doctorId: user.id, estado: "CARGADA" },
    data: { estado: "CONFIRMADA", confirmadaAt: new Date() },
  });
  if (count === 0) {
    return NextResponse.json({ error: "No hay una carga para confirmar." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
