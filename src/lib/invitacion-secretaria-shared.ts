import { z } from "zod";

// Separado de `invitacion-secretaria.ts` (que importa Prisma y `node:crypto`)
// para poder usarlo también desde el cliente.

// Más largo que el de "olvidé mi contraseña": la secretaria no lo pidió, le
// llega cuando el médico la invita y puede tardar unos días en verlo. Si
// vence, el médico la reenvía (o ella entra igual con Google / recuperando
// la contraseña y la acepta desde adentro).
export const INVITACION_VALIDEZ_DIAS = 7;

// Cookie que `/invitacion` setea justo antes de `signIn("google")`: el
// callback de auth (src/auth.ts) la lee para aceptar la invitación si la
// cuenta de Google es la del email invitado. Mismo patrón que `TERMINOS_COOKIE`.
export const INVITACION_COOKIE = "semio_invitacion";
export const INVITACION_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export const activarInvitacionSchema = z.object({
  token: z.string().min(1, "Link inválido."),
  nombre: z.string().trim().min(1, "Completá tu nombre."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});
