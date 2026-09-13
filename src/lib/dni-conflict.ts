import { prisma } from "@/lib/prisma";

export type DniConflict = { id: string; nombreYApellido: string };

/**
 * Busca otro paciente DEL MISMO tenant que ya tenga ese mismo DNI
 * (excluyendo, en edición, al propio paciente). El DNI es único solo
 * dentro de la cuenta de un médico, no globalmente.
 */
export async function findDniConflict(
  tenantId: string,
  nroDocumento: string,
  excludePatientId?: string
): Promise<DniConflict | null> {
  return prisma.patient.findFirst({
    where: {
      doctorId: tenantId,
      nroDocumento,
      ...(excludePatientId ? { id: { not: excludePatientId } } : {}),
    },
    select: { id: true, nombreYApellido: true },
  });
}
