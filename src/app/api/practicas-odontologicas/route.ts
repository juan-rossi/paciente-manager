import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

// Catálogo del nomenclador odontológico (~100 filas): el modal de prácticas lo
// pide una vez y filtra en el cliente.
export async function GET() {
  const { response } = await requireDoctor();
  if (response) return response;

  const practicas = await prisma.practicaOdontologica.findMany({
    where: { activo: true },
    select: { id: true, codigo: true, descripcion: true, capitulo: true, subgrupo: true },
    orderBy: { codigo: "asc" },
  });

  return NextResponse.json({ practicas });
}
