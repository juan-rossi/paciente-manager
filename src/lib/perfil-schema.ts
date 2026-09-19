import { z } from "zod";
import { ESPECIALIDAD_VALUES, type Especialidad } from "@/lib/especialidad";

const tituloCortesiaSchema = z.enum(["DR", "DRA", "LIC"], {
  message: "Elegí un título.",
});

const especialidadSchema = z.enum(ESPECIALIDAD_VALUES as [Especialidad, ...Especialidad[]], {
  message: "Elegí una especialidad.",
});

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

// Los campos de "Información pública" (atencionTipo, teléfono, dirección y
// -- si atiende en consultorio -- el nombre del consultorio) solo son
// obligatorios cuando `perfilPublico` está habilitado. La biografía nunca es
// obligatoria.
export const perfilSchema = z
  .object({
    tituloCortesia: tituloCortesiaSchema,
    nombre: z.string().trim().min(1, "El nombre es obligatorio."),
    apellido: z.string().trim().min(1, "El apellido es obligatorio."),
    especialidad: especialidadSchema,
    nroMatricula: z.string().trim().min(1, "El número de matrícula es obligatorio."),
    perfilPublico: z.boolean(),
    atencionTipo: z.enum(["PARTICULAR", "CONSULTORIO"]).nullable().optional(),
    nombreConsultorio: optionalString,
    telefono: optionalString,
    direccion: optionalString,
    ciudad: optionalString,
    latitud: z.number().nullable().optional(),
    longitud: z.number().nullable().optional(),
    biografia: optionalString,
  })
  .superRefine((data, ctx) => {
    if (!data.perfilPublico) return;
    if (!data.atencionTipo) {
      ctx.addIssue({ code: "custom", path: ["atencionTipo"], message: "Elegí cómo atendés." });
    }
    if (data.atencionTipo === "CONSULTORIO" && !data.nombreConsultorio) {
      ctx.addIssue({
        code: "custom",
        path: ["nombreConsultorio"],
        message: "El nombre del consultorio es obligatorio.",
      });
    }
    if (!data.telefono) {
      ctx.addIssue({ code: "custom", path: ["telefono"], message: "El teléfono es obligatorio." });
    }
    if (!data.direccion) {
      ctx.addIssue({ code: "custom", path: ["direccion"], message: "La dirección es obligatoria." });
    }
    if (!data.ciudad) {
      ctx.addIssue({ code: "custom", path: ["ciudad"], message: "La ciudad es obligatoria." });
    }
  });

export const agendaPublicaSchema = z.object({
  reservaPublicaHabilitada: z.boolean(),
});

export const passwordChangeSchema = z.object({
  passwordActual: z.string().min(1, "Ingresá tu contraseña actual."),
  passwordNueva: z.string().min(6, "La contraseña nueva debe tener al menos 6 caracteres."),
});

export const fotoPerfilSchema = z.object({
  fotoPerfil: z.string().startsWith("data:image/", "Formato de imagen inválido."),
});
