import { z } from "zod";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const motivoSchema = z
  .string()
  .trim()
  .max(500, "El motivo es demasiado largo.")
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const bloqueoHorarioInputSchema = z.discriminatedUnion("modo", [
  z.object({
    modo: z.literal("dia"),
    fecha: z.string().regex(FECHA_REGEX, "Fecha inválida."),
    motivo: motivoSchema,
  }),
  z.object({
    modo: z.literal("bloques"),
    fecha: z.string().regex(FECHA_REGEX, "Fecha inválida."),
    bloqueKeys: z.array(z.string().min(1)).min(1, "Elegí al menos un bloque."),
    motivo: motivoSchema,
  }),
]);
