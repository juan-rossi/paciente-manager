import type { UserRole } from "@/lib/auth";

/**
 * En multi-tenant, cada `Patient`/`Turno` pertenece a la cuenta de UN
 * médico (tenant root). Un `DOCTOR` es su propio tenant (`id`); una
 * `SECRETARY` opera dentro de la cuenta de su médico (`doctorId`).
 */
export function getTenantId(user: { role: UserRole; id: string; doctorId: string | null }): string {
  return user.role === "DOCTOR" ? user.id : user.doctorId!;
}
