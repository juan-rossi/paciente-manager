import type { UserRole } from "@/lib/auth";

/**
 * En multi-tenant, cada `Patient`/`Turno` pertenece a la cuenta de UN
 * médico (tenant root). Un `DOCTOR` es su propio tenant (`id`); una
 * `SECRETARY` puede asistir a más de un médico (ver `DoctorSecretaria`) y
 * opera dentro de la cuenta indicada por `activeDoctorId` -- el médico que
 * eligió en el selector del header. Se valida que el médico elegido
 * realmente esté asignado a la secretaria en el momento de setear
 * `activeDoctorId` (ver `src/app/api/account/active-doctor/route.ts`), no
 * acá en cada lectura.
 */
export function getTenantId(user: { role: UserRole; id: string; activeDoctorId: string | null }): string {
  return user.role === "DOCTOR" ? user.id : user.activeDoctorId!;
}
