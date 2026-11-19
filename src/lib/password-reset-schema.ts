import { z } from "zod";
import { MENSAJE_PASSWORD_MIN, PASSWORD_MIN } from "@/lib/password-policy";

// Separado de `password-reset.ts` (que importa Prisma y `node:crypto`) para
// poder usarlo también desde los formularios del cliente.
export const recuperarSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "El email es obligatorio.").email("Email inválido."),
});

export const restablecerSchema = z.object({
  token: z.string().min(1, "Link inválido."),
  password: z.string().min(PASSWORD_MIN, MENSAJE_PASSWORD_MIN),
});
