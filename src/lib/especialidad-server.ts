import { prisma } from "@/lib/prisma";
import { usaExamenFisico } from "@/lib/especialidad";

// Igual que el odontograma (ver tenantEsOdontologo), depende de la
// especialidad del médico dueño del tenant, no del usuario logueado.
export async function tenantUsaExamenFisico(tenantId: string): Promise<boolean> {
  const doctor = await prisma.user.findUnique({
    where: { id: tenantId },
    select: { especialidad: true },
  });
  return usaExamenFisico(doctor?.especialidad);
}
