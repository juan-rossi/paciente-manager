import type { UserRole } from "@/lib/auth";

// Un usuario tiene acceso al panel /admin si es la cuenta de plataforma
// (role === "ADMIN", sin tenant) o si es un DOCTOR/SECRETARY al que se le
// otorgó el flag `isAdmin` a mano (ver scripts/grant-admin-access.ts) --
// típicamente un médico que también es owner/staff de Semio 360. A
// diferencia de `role`, este flag no cambia en qué tenant opera: sigue
// viendo su propia cuenta normalmente y, además, puede entrar a /admin.
export function isPlatformAdmin(user: { role: UserRole; isAdmin?: boolean | null }): boolean {
  return user.role === "ADMIN" || user.isAdmin === true;
}
