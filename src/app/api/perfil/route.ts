import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { perfilSchema } from "@/lib/perfil-schema";

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = perfilSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      tituloCortesia: parsed.data.tituloCortesia,
      nombre: parsed.data.nombre,
      apellido: parsed.data.apellido,
      especialidad: parsed.data.especialidad,
      nroMatricula: parsed.data.nroMatricula,
      perfilPublico: parsed.data.perfilPublico,
      atencionTipo: parsed.data.atencionTipo ?? null,
      nombreConsultorio: parsed.data.nombreConsultorio,
      telefono: parsed.data.telefono,
      direccion: parsed.data.direccion,
      biografia: parsed.data.biografia,
    },
  });

  return NextResponse.json({
    tituloCortesia: updated.tituloCortesia,
    nombre: updated.nombre,
    apellido: updated.apellido,
    especialidad: updated.especialidad,
    nroMatricula: updated.nroMatricula,
    perfilPublico: updated.perfilPublico,
    atencionTipo: updated.atencionTipo,
    nombreConsultorio: updated.nombreConsultorio,
    telefono: updated.telefono,
    direccion: updated.direccion,
    biografia: updated.biografia,
  });
}
