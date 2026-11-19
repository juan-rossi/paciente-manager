import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type AuditAccion =
  | "CREAR"
  | "MODIFICAR"
  | "ELIMINAR"
  | "RESTAURAR"
  | "EXPORTAR"
  | "SANCIONAR"
  | "LEVANTAR_SANCION";
type AuditEntidad =
  | "PACIENTE"
  | "EVOLUCION"
  | "CONSENTIMIENTO"
  | "ODONTOGRAMA"
  | "PRACTICA_ODONTOLOGICA"
  | "PRESUPUESTO"
  | "CUENTA";

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

type AntecedenteAuditable = {
  tipo: string;
  respuesta: boolean;
  descripcion?: string | null;
  fechaInicio?: string | null;
  medicacion?: string | null;
  resolucion?: string | null;
};

function describirAntecedente(a: AntecedenteAuditable | undefined): string {
  if (!a) return "sin cargar";
  return [
    a.respuesta ? "Sí" : "No",
    a.descripcion,
    a.fechaInicio && `desde ${a.fechaInicio}`,
    a.medicacion && `medicación: ${a.medicacion}`,
    a.resolucion && `resolución: ${a.resolucion}`,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Ley 26.529 art. 13: estado ANTERIOR de los antecedentes que cambian al
 * editar un paciente, como un texto legible para el historial de la ficha
 * (una línea por antecedente). `null` si ninguno cambió.
 */
export function diffAntecedentesAnterior(
  antes: AntecedenteAuditable[],
  despues: AntecedenteAuditable[],
  etiqueta: (tipo: string) => string
): string | null {
  const previos = new Map(antes.map((a) => [a.tipo, a]));
  const lineas: string[] = [];
  for (const nuevo of despues) {
    const previo = previos.get(nuevo.tipo);
    const igual =
      previo !== undefined
        ? previo.respuesta === nuevo.respuesta &&
          (previo.descripcion ?? null) === (nuevo.descripcion ?? null) &&
          (previo.fechaInicio ?? null) === (nuevo.fechaInicio ?? null) &&
          (previo.medicacion ?? null) === (nuevo.medicacion ?? null) &&
          (previo.resolucion ?? null) === (nuevo.resolucion ?? null)
        : !nuevo.respuesta && !nuevo.descripcion && !nuevo.fechaInicio && !nuevo.medicacion && !nuevo.resolucion;
    if (!igual) lineas.push(`${etiqueta(nuevo.tipo)}: ${describirAntecedente(previo)}`);
  }
  return lineas.length > 0 ? lineas.join("\n") : null;
}
