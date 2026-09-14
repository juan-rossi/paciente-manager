import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const consentimientoSchema = z.object({
  procedimiento: z.string().trim().min(1, "El procedimiento es obligatorio."),
  riesgosBeneficios: z
    .string()
    .trim()
    .min(1, "Los riesgos y beneficios informados son obligatorios."),
  alternativas: optionalString,
  tipo: z.enum(["VERBAL", "ESCRITO"], { message: "El tipo es obligatorio." }),
  estado: z.enum(["OTORGADO", "RECHAZADO"], { message: "El estado es obligatorio." }),
  fecha: z.string().trim().min(1, "La fecha es obligatoria."),
});

export type ConsentimientoInput = z.infer<typeof consentimientoSchema>;

export const revocarConsentimientoSchema = z.object({
  motivo: optionalString,
});
