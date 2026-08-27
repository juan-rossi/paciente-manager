import { prisma } from "@/lib/prisma";

export type DniConflict = { id: string; nombreYApellido: string };

/** Busca otro paciente que ya tenga ese mismo DNI (excluyendo, en edición, al propio paciente). */
export async function findDniConflict(
  nroDocumento: string,
  excludePatientId?: string
): Promise<DniConflict | null> {
  return prisma.patient.findFirst({
    where: {
      nroDocumento,
      ...(excludePatientId ? { id: { not: excludePatientId } } : {}),
    },
    select: { id: true, nombreYApellido: true },
  });
}
