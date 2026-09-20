import type { UserRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

/**
 * Dentro del médico activo, una secretaria solo puede administrar turnos de
 * uno de los lugares que tiene asignados para ESE médico (ver
 * `DoctorSecretariaLugar` -- es específico de la relación médico-secretaria,
 * no de la secretaria en general). Devuelve:
 * - `undefined` para un DOCTOR: no hay restricción, ve todos sus lugares.
 * - el `lugarId` activo para una SECRETARY con al menos un lugar asignado.
 * - `null` para una SECRETARY sin ningún lugar asignado (no debería pasar
 *   dado que es obligatorio al crear/editar, pero el médico puede haberle
 *   sacado todos después) -- el llamador debe tratarlo como "no ve nada",
 *   nunca como "sin restricción".
 *
 * El médico puede cambiarle los lugares asignados a la secretaria en
 * cualquier momento (ver PATCH /api/users/[id]), así que esto se revalida
 * en cada request contra `DoctorSecretariaLugar` en vez de confiar
 * ciegamente en `activeLugarId` -- si el guardado ya no es válido, se
 * autocorrige al primero de los permitidos y lo persiste.
 */
export async function resolveActiveLugarId(user: {
  role: UserRole;
  id: string;
  activeDoctorId: string | null;
  activeLugarId: string | null;
}): Promise<string | null | undefined> {
  if (user.role !== "SECRETARY") return undefined;

  const doctorId = user.activeDoctorId;
  if (!doctorId) return null;

  const asignacion = await prisma.doctorSecretaria.findUnique({
    where: { doctorId_secretariaId: { doctorId, secretariaId: user.id } },
    select: { lugares: { orderBy: { createdAt: "asc" }, select: { lugarId: true } } },
  });
  const permitidos = asignacion?.lugares.map((l) => l.lugarId) ?? [];
  if (permitidos.length === 0) return null;

  if (user.activeLugarId && permitidos.includes(user.activeLugarId)) {
    return user.activeLugarId;
  }

  const nuevoActivo = permitidos[0];
  await prisma.user.update({ where: { id: user.id }, data: { activeLugarId: nuevoActivo } });
  return nuevoActivo;
}
