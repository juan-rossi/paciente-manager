import { z } from "zod";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const motivoSchema = z
  .string()
  .trim()
  .max(500, "El motivo es demasiado largo.")
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

// Ausente = todavía no se sabe si hay conflicto (primer POST): el endpoint
// devuelve 409 con la lista de turnos afectados sin escribir nada. Presente
// = el usuario ya eligió cómo resolverlos, en un segundo POST.
const resolucionConflictoSchema = z
  .enum(["cancelar", "mover_dia_libre", "mover_siguiente_libre"])
  .optional();

// Solo se manda (y hace falta) con `resolucionConflicto: "mover_dia_libre"`
// -- una fecha elegida por el usuario por cada lugar afectado (ver
// `validarDiasLibreElegidos`, nunca se confía en esto tal cual).
const diasLibreElegidosSchema = z
  .array(
    z.object({
      lugarId: z.string().min(1),
      fecha: z.string().regex(FECHA_REGEX, "Fecha inválida."),
    })
  )
  .optional();

// Solo aplican con `resolucionConflicto: "mover_dia_libre"` -- ver
// `resolverConflictos` en bloqueo-conflictos.ts.
const horariosConsecutivosSchema = z.boolean().default(false);
const habilitarTurnosNuevosSchema = z.boolean().default(true);

export const bloqueoHorarioInputSchema = z.discriminatedUnion("modo", [
  z.object({
    modo: z.literal("dia"),
    fecha: z.string().regex(FECHA_REGEX, "Fecha inválida."),
    motivo: motivoSchema,
    resolucionConflicto: resolucionConflictoSchema,
    diasLibreElegidos: diasLibreElegidosSchema,
    horariosConsecutivos: horariosConsecutivosSchema,
    habilitarTurnosNuevos: habilitarTurnosNuevosSchema,
  }),
  z.object({
    modo: z.literal("bloques"),
    fecha: z.string().regex(FECHA_REGEX, "Fecha inválida."),
    bloqueKeys: z.array(z.string().min(1)).min(1, "Elegí al menos un bloque."),
    motivo: motivoSchema,
    resolucionConflicto: resolucionConflictoSchema,
    diasLibreElegidos: diasLibreElegidosSchema,
    horariosConsecutivos: horariosConsecutivosSchema,
    habilitarTurnosNuevos: habilitarTurnosNuevosSchema,
  }),
]);
