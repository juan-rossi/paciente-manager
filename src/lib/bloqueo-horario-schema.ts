import { z } from "zod";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const motivoSchema = z
  .string()
  .trim()
  .max(500, "El motivo es demasiado largo.")
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

// La resolución que el usuario eligió para UN bloque en conflicto (wizard
// por bloque, ver turnos-calendar.tsx) -- `fecha` solo hace falta con
// "mover_dia_libre" (ver `validarDiasLibreElegidos`, nunca se confía en
// esto tal cual server-side). `horariosConsecutivos`/`habilitarTurnosNuevos`
// también son propios de "mover_dia_libre" (ver `resolverConflictos`).
const resolucionPorBloqueSchema = z
  .object({
    bloqueKey: z.string().min(1),
    resolucion: z.enum(["cancelar", "mover_dia_libre", "mover_siguiente_libre"]),
    fecha: z.string().regex(FECHA_REGEX, "Fecha inválida.").optional(),
    horariosConsecutivos: z.boolean().default(false),
    habilitarTurnosNuevos: z.boolean().default(true),
  })
  .refine((v) => v.resolucion !== "mover_dia_libre" || !!v.fecha, {
    message: "Elegí a qué día mover estos turnos.",
    path: ["fecha"],
  });

// Ausente = todavía no se sabe si hay conflicto (primer POST): el endpoint
// devuelve 409 con los bloques afectados sin escribir nada. Presente = el
// usuario ya recorrió el wizard y eligió una resolución por cada bloque, en
// un segundo POST.
const resolucionesPorBloqueSchema = z.array(resolucionPorBloqueSchema).optional();

export const bloqueoHorarioInputSchema = z.discriminatedUnion("modo", [
  z.object({
    modo: z.literal("dia"),
    fecha: z.string().regex(FECHA_REGEX, "Fecha inválida."),
    motivo: motivoSchema,
    resolucionesPorBloque: resolucionesPorBloqueSchema,
  }),
  z.object({
    modo: z.literal("bloques"),
    fecha: z.string().regex(FECHA_REGEX, "Fecha inválida."),
    bloqueKeys: z.array(z.string().min(1)).min(1, "Elegí al menos un bloque."),
    motivo: motivoSchema,
    resolucionesPorBloque: resolucionesPorBloqueSchema,
  }),
]);
