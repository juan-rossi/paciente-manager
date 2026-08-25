import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { patientSchema } from "@/lib/patient-schema";

const listSelect = {
  id: true,
  nombreYApellido: true,
  nroDocumento: true,
  fechaNacimiento: true,
  telefono: true,
  updatedAt: true,
} satisfies Prisma.PatientSelect;

export async function GET(request: NextRequest) {
  const { response } = await requireDoctor();
  if (response) return response;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  const patients = await prisma.patient.findMany({
    where: q
      ? {
          OR: [
            { nroDocumento: { contains: q, mode: "insensitive" } },
            { nombreYApellido: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: listSelect,
    orderBy: q ? { nombreYApellido: "asc" } : { updatedAt: "desc" },
    take: q ? 50 : 10,
  });

  return NextResponse.json({ patients });
}

export async function POST(request: NextRequest) {
  const { response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = patientSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { antecedentes, evoluciones, ...patientFields } = parsed.data;

  const patient = await prisma.patient.create({
    data: {
      ...patientFields,
      antecedentes: {
        create: antecedentes
          .filter((a) => a.respuesta)
          .map((a) => ({
            tipo: a.tipo,
            respuesta: a.respuesta,
            descripcion: a.descripcion,
            fechaInicio: a.fechaInicio,
            medicacion: a.medicacion,
            resolucion: a.resolucion,
          })),
      },
      evoluciones: {
        create: evoluciones.map((e) => ({
          fecha: new Date(e.fecha),
          contenido: e.contenido,
        })),
      },
    },
  });

  return NextResponse.json({ patient }, { status: 201 });
}
