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
  detalleAnterior?: Prisma.InputJsonValue;
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

/**
 * Ley 26.529 art. 13 (inalterabilidad): para un MODIFICAR, compara el
 * registro antes/después y devuelve SOLO los campos que efectivamente
 * cambiaron, con su valor ANTERIOR -- así una edición nunca hace
 * desaparecer sin rastro el contenido previo. Devuelve `null` si no cambió
 * nada (no vale la pena loguear un "modificar" sin diferencias reales).
 */
export function calcularDiffAnterior<T extends Record<string, unknown>>(
  antes: T,
  despues: Partial<T>
): Prisma.InputJsonValue | null {
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(despues)) {
    const valorAntes = antes[key];
    const valorDespues = despues[key as keyof T];
    if (JSON.stringify(valorAntes) !== JSON.stringify(valorDespues)) {
      diff[key] = valorAntes ?? null;
    }
  }
  if (Object.keys(diff).length === 0) return null;
  // JSON.parse(JSON.stringify(...)) normaliza cualquier `Date` a string ISO
  // -- el campo `detalleAnterior` es un Json de Prisma, no acepta `Date` cruda.
  return JSON.parse(JSON.stringify(diff)) as Prisma.InputJsonValue;
}
