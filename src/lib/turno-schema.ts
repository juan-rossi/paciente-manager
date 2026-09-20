import { z } from "zod";
import { DIA_SEMANA_VALUES } from "@/lib/slots";

const HORA_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const scheduleBlockSchema = z
  .object({
    diaSemana: z.enum(DIA_SEMANA_VALUES),
    horaInicio: z.string().regex(HORA_REGEX, "Formato de hora inválido."),
    horaFin: z.string().regex(HORA_REGEX, "Formato de hora inválido."),
    // Obligatorio para bloques nuevos o editados -- ver "Mi práctica". Los
    // bloques creados antes de esa feature pueden tener `lugarId: null` en
    // la DB, pero no se pueden volver a guardar sin elegir uno.
    lugarId: z.string().trim().min(1, "Elegí un lugar."),
  })
  .refine((data) => data.horaInicio < data.horaFin, {
    message: "La hora de salida debe ser posterior a la de entrada.",
    path: ["horaFin"],
  });

export const slotDurationSchema = z.object({
  slotDurationMinutes: z.coerce.number().int().min(5).max(240),
  applyReschedule: z.boolean().optional(),
  sobreturnosHabilitados: z.boolean().optional(),
});

export const messagingSchema = z.object({
  mensajeTemplate: z.string().trim().min(1, "El mensaje es obligatorio."),
  recordatorioDiasAdelanto: z.coerce.number().int().min(0).max(90),
  mensajeriaHabilitada: z.boolean(),
});

export const turnoInputSchema = z.object({
  inicio: z.string().min(1, "La fecha y hora son obligatorias."),
  nombreYApellido: z.string().trim().min(1, "El nombre y apellido es obligatorio."),
  fechaNacimiento: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  dni: z
    .string()
    .trim()
    .min(1, "El DNI es obligatorio.")
    .regex(/^\d+$/, "El DNI solo puede contener números."),
  telefono: z.string().trim().min(1, "El teléfono es obligatorio."),
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
  // Un sobreturno puede caer justo en el mismo instante que un turno ya
  // reservado (es la idea: agregarlo de más, no reemplazar la grilla) --
  // salta el chequeo de duplicado que sí aplica a una reserva normal.
  esSobreturno: z.boolean().optional(),
  // Lo completa el cliente a partir del `DaySlot` elegido (que ya trae el
  // `lugarId` del bloque que generó ese horario) -- puede venir `null` si
  // el slot corresponde a un bloque legado sin lugar asignado.
  lugarId: z.string().trim().min(1).nullable().optional(),
});

export const turnoEditSchema = turnoInputSchema.pick({
  nombreYApellido: true,
  dni: true,
  telefono: true,
  obraSocial: true,
});

// `password`/`nombre` son opcionales acá porque el mismo formulario también
// sirve para "sumar" a tu cuenta una secretaria que ya existe (asiste a otro
// médico) -- en ese caso se ignoran y no hace falta completarlos. La ruta
// exige ambos solo cuando el email no corresponde a nadie todavía.
export const secretaryInputSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "El email es obligatorio.").email("Email inválido."),
  password: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v === null || v.length >= 6, "La contraseña debe tener al menos 6 caracteres."),
  nombre: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const secretaryUpdateSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "El email es obligatorio.").email("Email inválido."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  password: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v === null || v.length >= 6, "La contraseña debe tener al menos 6 caracteres."),
});
