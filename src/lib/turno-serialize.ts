import type { UserRole } from "@/lib/auth";

type TurnoLike = {
  patientId: string | null;
  [key: string]: unknown;
};

// Campos internos que nunca viajan al navegador, para ningún rol: el hash del
// token de cancelación pública, el código del link que recibe el paciente
// (`/t/<codigo>`, permite confirmar/cancelar como él), quién lo cargó o le
// cambió la modalidad y el nombre de la sala de la teleconsulta. La UI no los usa: el link del
// recordatorio y el acceso a la sala se arman del lado del servidor.
const CAMPOS_INTERNOS = [
  "cancelTokenHash",
  "linkCodigo",
  "creadoPorId",
  "modalidadCambiadaPorId",
  "salaVideoNombre",
  "salaVideoCierraAt",
] as const;

/**
 * El vínculo con el paciente clínico (`patientId`) es información exclusiva del médico.
 * Los asistentes (y un ADMIN, que nunca debería llegar acá -- ver getTenantId())
 * solo ven los datos que ellas mismas ingresan al reservar el turno.
 */
export function serializeTurno<T extends TurnoLike>(turno: T, role: UserRole) {
  const rest: Record<string, unknown> = { ...turno };
  for (const campo of CAMPOS_INTERNOS) delete rest[campo];
  if (role !== "DOCTOR") delete rest.patientId;
  return rest as Omit<T, (typeof CAMPOS_INTERNOS)[number]>;
}
