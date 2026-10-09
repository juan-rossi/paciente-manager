import { z } from "zod";

// Separado de `password-reset.ts` (que importa Prisma y `node:crypto`) para
// poder usarlo también desde los formularios del cliente.
export const recuperarSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "El email es obligatorio.").email("Email inválido."),
});

export const restablecerSchema = z.object({
  token: z.string().min(1, "Link inválido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});
