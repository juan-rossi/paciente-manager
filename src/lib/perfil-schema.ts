import { z } from "zod";
import { ESPECIALIDAD_VALUES, type Especialidad } from "@/lib/especialidad";
import { TITULO_CORTESIA_VALUES, type TituloCortesia } from "@/lib/titulo-cortesia";

const tituloCortesiaSchema = z.enum(TITULO_CORTESIA_VALUES as [TituloCortesia, ...TituloCortesia[]], {
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

// Lo único que se edita en "Información pública" es la biografía: el resto
// (consultorio, dirección, teléfono, ciudad) se toma de las prácticas
// (`LugarDeTrabajo`) del médico. Los campos equivalentes de `User` quedan como
// legado y ya no se escriben desde acá.
export const perfilSchema = z.object({
  tituloCortesia: tituloCortesiaSchema,
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  apellido: z.string().trim().min(1, "El apellido es obligatorio."),
  especialidad: especialidadSchema,
  nroMatricula: z.string().trim().min(1, "El número de matrícula es obligatorio."),
  perfilPublico: z.boolean(),
  biografia: optionalString,
  // Ids de los lugares que se muestran en el perfil público; el resto queda
  // oculto (`LugarDeTrabajo.perfilVisible`).
  lugaresVisibles: z.array(z.string()),
});

export const agendaPublicaSchema = z.object({
  reservaPublicaHabilitada: z.boolean(),
});

export const lugarAgendaPublicaSchema = z.object({
  reservaPublicaHabilitada: z.boolean(),
});

export const passwordChangeSchema = z.object({
  passwordActual: z.string().min(1, "Ingresá tu contraseña actual."),
  passwordNueva: z.string().min(6, "La contraseña nueva debe tener al menos 6 caracteres."),
});

export const fotoPerfilSchema = z.object({
  fotoPerfil: z.string().startsWith("data:image/", "Formato de imagen inválido."),
});
