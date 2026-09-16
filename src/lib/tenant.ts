import type { UserRole } from "@/lib/auth";

/**
 * En multi-tenant, cada `Patient`/`Turno` pertenece a la cuenta de UN
 * médico (tenant root). Un `DOCTOR` es su propio tenant (`id`); una
 * `SECRETARY` puede asistir a más de un médico (ver `DoctorSecretaria`) y
 * opera dentro de la cuenta indicada por `activeDoctorId` -- el médico que
 * eligió en el selector del header (ver `src/components/doctor-switcher.tsx`).
 * Se valida que el médico elegido realmente esté asignado a la secretaria
 * en el momento de setear `activeDoctorId` (ver
 * `src/app/api/account/active-doctor/route.ts`), no acá en cada lectura.
 *
 * Un `ADMIN` (owner de Semio 360) NO es un tenant -- ve todas las cuentas
 * de médicos de la plataforma, no una en particular. Cualquier ruta bajo
 * `/admin` consulta directamente por todos los `DOCTOR` (ver
 * `src/lib/admin-metrics.ts`), nunca a través de `getTenantId`.
 */
export function getTenantId(user: { role: UserRole; id: string; activeDoctorId: string | null }): string {
  if (user.role === "ADMIN") {
    throw new Error(
      "getTenantId: ADMIN no pertenece a ningún tenant (ve todas las cuentas de la plataforma) -- no debería llamarse desde una ruta de owner/admin."
    );
  }
  return user.role === "DOCTOR" ? user.id : user.activeDoctorId!;
}
