import { prisma } from "@/lib/prisma";
import type { Especialidad } from "@/lib/especialidad";

// Igual que el odontograma (ver tenantEsOdontologo), la forma de la historia
// clínica depende de la especialidad del médico dueño del tenant, no del
// usuario logueado.
export async function tenantEspecialidad(tenantId: string): Promise<Especialidad | null> {
  const doctor = await prisma.user.findUnique({
    where: { id: tenantId },
    select: { especialidad: true },
  });
  return doctor?.especialidad ?? null;
}
