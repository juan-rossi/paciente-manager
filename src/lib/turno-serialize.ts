import type { UserRole } from "@/lib/auth";

type TurnoLike = {
  patientId: string | null;
  [key: string]: unknown;
};

/**
 * El vínculo con el paciente clínico (`patientId`) es información exclusiva del médico.
 * Las secretarias (y un ADMIN, que nunca debería llegar acá -- ver getTenantId())
 * solo ven los datos que ellas mismas ingresan al reservar el turno.
 */
export function serializeTurno<T extends TurnoLike>(turno: T, role: UserRole) {
  if (role === "DOCTOR") return turno;
  const rest: Record<string, unknown> = { ...turno };
  delete rest.patientId;
  return rest;
}
