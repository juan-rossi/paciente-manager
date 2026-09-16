import { z } from "zod";

export const gastoInputSchema = z.object({
  fecha: z.string().trim().min(1, "La fecha es obligatoria.").transform((value) => new Date(value)),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria."),
  monto: z.coerce.number().int("El monto debe ser un número entero.").positive("El monto debe ser mayor a 0."),
});
