import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { exportarHistoriaClinica } from "@/lib/exportar-historia-clinica";

type RouteParams = { params: Promise<{ id: string }> };

// Un médico suspendido no puede entrar a "Mis datos", pero por ley tiene que
// poder llevarse sus historias clínicas: las pide a contacto@ y un admin se
// las genera desde su ficha. Solo con la suspensión vigente -- para cualquier
// otro médico, la plataforma no tiene por qué descargar historias clínicas
// ajenas.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { user: admin, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;

  const doctor = await prisma.user.findFirst({
    where: { id, role: "DOCTOR" },
    select: { suspendidoAt: true },
  });
  if (!doctor) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }
  if (!doctor.suspendidoAt) {
    return NextResponse.json(
      { error: "Solo se exporta desde acá la cuenta de un médico suspendido." },
      { status: 403 }
    );
  }

  return exportarHistoriaClinica(id, admin.id);
}
