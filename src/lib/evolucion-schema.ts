import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

// Alta y edición de una entrada de evolución (sesión, para psicología). Sin
// un campo opcional, no se toca; vacío, se borra.
export const evolucionInput = z
  .object({
    fecha: z.string().trim().min(1, "La fecha es obligatoria."),
    contenido: z.string().trim(),
    // Dictado original cuando `contenido` es un resumen de IA.
    contenidoDictado: optionalText,
    // Solo sesiones de psicología.
    asistencia: z.enum(["PRESENTE", "AUSENTE", "CANCELADA"]).nullable().optional(),
    modalidad: z.enum(["PRESENCIAL", "ONLINE"]).nullable().optional(),
    riesgo: z.enum(["SIN_RIESGO", "BAJO", "MODERADO", "ALTO"]).nullable().optional(),
    notasPrivadas: optionalText,
  })
  // Una sesión a la que el consultante no vino puede no tener notas.
  .refine(
    (data) =>
      data.contenido.length > 0 || data.asistencia === "AUSENTE" || data.asistencia === "CANCELADA",
    { message: "El contenido es obligatorio.", path: ["contenido"] }
  );

export type EvolucionInput = z.infer<typeof evolucionInput>;

// Los campos de sesión que vinieron en el pedido, listos para Prisma (los
// que no vinieron no se tocan).
export function camposSesion(data: EvolucionInput) {
  const campos: Partial<Pick<EvolucionInput, "asistencia" | "modalidad" | "riesgo" | "notasPrivadas">> = {};
  if (data.asistencia !== undefined) campos.asistencia = data.asistencia;
  if (data.modalidad !== undefined) campos.modalidad = data.modalidad;
  if (data.riesgo !== undefined) campos.riesgo = data.riesgo;
  if (data.notasPrivadas !== undefined) campos.notasPrivadas = data.notasPrivadas;
  return campos;
}
