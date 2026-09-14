import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type AuditAccion = "CREAR" | "MODIFICAR" | "ELIMINAR" | "RESTAURAR" | "EXPORTAR";
type AuditEntidad = "PACIENTE" | "EVOLUCION";

type RegistrarAuditoriaParams = {
  doctorId: string;
  actorId: string;
  accion: AuditAccion;
  entidad: AuditEntidad;
  entidadId: string;
};

/**
 * Ley 26.529 art. 13: deja una traza de quién hizo qué sobre un registro
 * clínico. `db` acepta tanto `prisma` como un `tx` de `$transaction` --
 * pasá el `tx` cuando la acción ya corre dentro de una transacción (así el
 * log queda atómico con el cambio), o `prisma` directo cuando no la hay.
 */
export async function registrarAuditoria(
  db: typeof prisma | Prisma.TransactionClient,
  params: RegistrarAuditoriaParams
): Promise<void> {
  await db.auditLog.create({ data: params });
}
