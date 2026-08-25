import { z } from "zod";
import { DIA_SEMANA_VALUES } from "@/lib/slots";

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const scheduleBlockSchema = z
  .object({
    diaSemana: z.enum(DIA_SEMANA_VALUES),
    horaInicio: z.string().regex(HORA_REGEX, "Formato de hora inválido."),
    horaFin: z.string().regex(HORA_REGEX, "Formato de hora inválido."),
  })
  .refine((data) => data.horaInicio < data.horaFin, {
    message: "La hora de salida debe ser posterior a la de entrada.",
    path: ["horaFin"],
  });

export const slotDurationSchema = z.object({
  slotDurationMinutes: z.coerce.number().int().min(5).max(240),
});

export const turnoInputSchema = z.object({
  inicio: z.string().min(1, "La fecha y hora son obligatorias."),
  nombreYApellido: z.string().trim().min(1, "El nombre y apellido es obligatorio."),
  fechaNacimiento: z.string().trim().min(1, "La fecha de nacimiento es obligatoria."),
  dni: z
    .string()
    .trim()
    .min(1, "El DNI es obligatorio.")
    .regex(/^\d+$/, "El DNI solo puede contener números."),
  obraSocial: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  obraSocialNro: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const secretaryInputSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "El email es obligatorio.").email("Email inválido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
});
