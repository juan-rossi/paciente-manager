import { prisma } from "@/lib/prisma";

export type TurnoPendienteAviso = {
  id: string;
  nombreYApellido: string;
  telefono: string;
  inicio: string;
  avisoPendienteMotivo: "CANCELADO" | "APLAZADO";
  avisoPendienteFechaAnterior: string | null;
};

// A diferencia de `getRecordatoriosDelDia`, esto NO está atado a un día
// puntual -- son los turnos que la resolución de conflictos de "Bloquear
// horarios" canceló/movió y todavía nadie marcó como notificados, sin
// importar la fecha (vieja o nueva) en la que hayan quedado. Mismo criterio
// de scoping por lugar que el resto de la app (`lugarId === null` = sin
// lugar asignado, no ve nada).
export async function getTurnosPendientesDeAviso(
  tenantId: string,
  lugarId?: string | null
): Promise<TurnoPendienteAviso[]> {
  if (lugarId === null) return [];

  const turnos = await prisma.turno.findMany({
    where: {
      doctorId: tenantId,
      avisoPendiente: true,
      ...(lugarId ? { lugarId } : {}),
    },
    orderBy: { inicio: "asc" },
    select: {
      id: true,
      nombreYApellido: true,
      telefono: true,
      inicio: true,
      avisoPendienteMotivo: true,
      avisoPendienteFechaAnterior: true,
    },
  });

  return turnos.map((t) => ({
    id: t.id,
    nombreYApellido: t.nombreYApellido,
    telefono: t.telefono,
    inicio: t.inicio.toISOString(),
    avisoPendienteMotivo: t.avisoPendienteMotivo as "CANCELADO" | "APLAZADO",
    avisoPendienteFechaAnterior: t.avisoPendienteFechaAnterior?.toISOString() ?? null,
  }));
}
