import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esOdontologica } from "@/lib/especialidad";

// El odontograma depende de la especialidad del médico dueño del tenant (no
// del usuario logueado): una secretaria ve lo mismo que el médico activo.
export async function tenantEsOdontologo(tenantId: string): Promise<boolean> {
  const doctor = await prisma.user.findUnique({
    where: { id: tenantId },
    select: { especialidad: true },
  });
  return esOdontologica(doctor?.especialidad);
}

// Chequeo común de las rutas /api/patients/[id]/odontogramas/**: el tenant es
// odontólogo y el paciente es suyo. Devuelve una respuesta de error o null.
export async function verificarAccesoOdontograma(
  tenantId: string,
  patientId: string
): Promise<NextResponse | null> {
  if (!(await tenantEsOdontologo(tenantId))) {
    return NextResponse.json(
      { error: "El odontograma solo está disponible para especialidades odontológicas." },
      { status: 403 }
    );
  }
  const owned = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
  }
  return null;
}

export const YA_HAY_INICIAL =
  "Este paciente ya tiene un odontograma inicial. Registrá la visita como control.";
