import { z } from "zod";

// Dirección y teléfono son obligatorios para ambos tipos; el nombre solo
// aplica (y es obligatorio) cuando el lugar es un consultorio -- un lugar
// particular no tiene "nombre de fantasía".
export const lugarTrabajoSchema = z
  .object({
    tipo: z.enum(["PARTICULAR", "CONSULTORIO"]),
    nombre: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    direccion: z.string().trim().min(1, "La dirección es obligatoria."),
    telefono: z.string().trim().min(1, "El teléfono es obligatorio."),
    latitud: z.number().nullable().optional(),
    longitud: z.number().nullable().optional(),
    ciudad: z.string().trim().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "CONSULTORIO" && !data.nombre) {
      ctx.addIssue({
        code: "custom",
        path: ["nombre"],
        message: "El nombre del consultorio es obligatorio.",
      });
    }
  });
