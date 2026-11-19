import { z } from "zod";
import { esFechaValida, MENSAJE_FECHA_INVALIDA, TEXTO_LARGO, TEXTO_MEDIO } from "@/lib/limites-texto";

const optionalString = z
  .string()
  .trim()
  .max(TEXTO_LARGO, `Máximo ${TEXTO_LARGO} caracteres.`)
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

export const consentimientoSchema = z.object({
  procedimiento: z.string().trim().min(1, "El procedimiento es obligatorio.").max(TEXTO_MEDIO),
  riesgosBeneficios: z
    .string()
    .trim()
    .min(1, "Los riesgos y beneficios informados son obligatorios.")
    .max(TEXTO_LARGO),
  alternativas: optionalString,
  tipo: z.enum(["VERBAL", "ESCRITO"], { message: "El tipo es obligatorio." }),
  estado: z.enum(["OTORGADO", "RECHAZADO"], { message: "El estado es obligatorio." }),
  fecha: z.string().trim().min(1, "La fecha es obligatoria.").refine(esFechaValida, MENSAJE_FECHA_INVALIDA),
});

export type ConsentimientoInput = z.infer<typeof consentimientoSchema>;

export const revocarConsentimientoSchema = z.object({
  motivo: optionalString,
});
