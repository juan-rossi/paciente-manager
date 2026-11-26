import { z } from "zod";

// La dirección y el teléfono son obligatorios para los lugares físicos: un
// lugar VIRTUAL (teleconsulta) no tiene ninguno de los dos -- se guardan ""
// (las columnas no son nullable) y sin coordenadas. El nombre es obligatorio solo en un consultorio -- un
// lugar particular no tiene "nombre de fantasía" y el virtual nunca tiene
// nombre propio: siempre se muestra "Teleconsulta" (se guarda null).
export const lugarTrabajoSchema = z
  .object({
    tipo: z.enum(["PARTICULAR", "CONSULTORIO", "VIRTUAL"]),
    nombre: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    direccion: z.string().trim().optional().default(""),
    telefono: z.string().trim().optional().default(""),
    latitud: z.number().nullable().optional(),
    longitud: z.number().nullable().optional(),
    ciudad: z.string().trim().nullable().optional(),
    // Pasar turnos de este lugar a teleconsulta (ver
    // `LugarDeTrabajo.permiteTeleconsulta`). Sin mandar = no se toca.
    permiteTeleconsulta: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo === "CONSULTORIO" && !data.nombre) {
      ctx.addIssue({
        code: "custom",
        path: ["nombre"],
        message: "El nombre del consultorio es obligatorio.",
      });
    }
    if (data.tipo !== "VIRTUAL" && !data.telefono) {
      ctx.addIssue({
        code: "custom",
        path: ["telefono"],
        message: "El teléfono es obligatorio.",
      });
    }
    if (data.tipo !== "VIRTUAL" && !data.direccion) {
      ctx.addIssue({
        code: "custom",
        path: ["direccion"],
        message: "La dirección es obligatoria.",
      });
    }
  })
  .transform((data) =>
    data.tipo === "VIRTUAL"
      ? {
          ...data,
          nombre: null,
          direccion: "",
          telefono: "",
          latitud: null,
          longitud: null,
          ciudad: null,
          permiteTeleconsulta: false,
        }
      : data
  );
