import { z } from "zod";
import { ESPECIALIDAD_VALUES, type Especialidad } from "@/lib/especialidad";
import { TITULO_CORTESIA_VALUES, type TituloCortesia } from "@/lib/titulo-cortesia";
import { normalizarRedSocial, REDES_SOCIALES, type RedSocial } from "@/lib/redes-sociales";
import { PASSWORD_MIN } from "@/lib/password-policy";

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

export const perfilSchema = z.object({
  tituloCortesia: tituloCortesiaSchema,
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  apellido: z.string().trim().min(1, "El apellido es obligatorio."),
  especialidad: especialidadSchema,
  nroMatricula: z.string().trim().min(1, "El número de matrícula es obligatorio."),
  // Ids del catálogo `Prepaga` con las que trabaja el médico.
  prepagaIds: z.array(z.string()).max(500),
  // Monto de la consulta particular en pesos (sin centavos); null = sin cargar.
  montoConsultaParticular: z
    .number({ message: "Ingresá un monto válido." })
    .int("El monto no lleva centavos.")
    .min(0, "El monto no puede ser negativo.")
    .max(100_000_000, "El monto es demasiado alto.")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
});

// Acepta "@usuario" o el link tal cual y lo guarda como URL completa; vacío
// queda en null.
function redSocialSchema(red: RedSocial) {
  return z
    .string()
    .nullish()
    .transform((valor, ctx) => {
      const resultado = normalizarRedSocial(red, valor);
      if (!resultado.ok) {
        ctx.addIssue({ code: "custom", message: resultado.error });
        return z.NEVER;
      }
      return resultado.url;
    });
}

const redesSocialesSchema = z.object(
  Object.fromEntries(REDES_SOCIALES.map((red) => [red, redSocialSchema(red)])) as {
    [K in RedSocial]: ReturnType<typeof redSocialSchema>;
  }
);

// "Información pública" (tab Visibilidad). Lo único que se edita a mano es la
// biografía: el resto (consultorio, dirección, teléfono, ciudad) se toma de las
// prácticas (`LugarDeTrabajo`) del médico. Los campos equivalentes de `User`
// quedan como legado y ya no se escriben desde acá.
export const visibilidadSchema = z.object({
  perfilPublico: z.boolean(),
  biografia: optionalString,
  // Ids de los lugares que se muestran en el perfil público; el resto queda
  // oculto (`LugarDeTrabajo.perfilVisible`).
  lugaresVisibles: z.array(z.string()),
  redes: redesSocialesSchema,
  // Muestra el monto de la consulta particular (Mi perfil) en el perfil público.
  montoConsultaVisible: z.boolean().default(false),
});

// Valores fijos (no un número libre) para el horizonte de la agenda pública.
export const RESERVA_PUBLICA_SEMANAS_OPCIONES = [1, 2, 4, 8, 12] as const;

// Cada campo se guarda por separado (switch y selector de semanas son
// controles instantáneos distintos), pero al menos uno tiene que venir.
export const agendaPublicaSchema = z
  .object({
    reservaPublicaHabilitada: z.boolean().optional(),
    reservaPublicaSemanas: z
      .number()
      .refine((n) => (RESERVA_PUBLICA_SEMANAS_OPCIONES as readonly number[]).includes(n))
      .optional(),
  })
  .refine((d) => d.reservaPublicaHabilitada !== undefined || d.reservaPublicaSemanas !== undefined);

export const lugarAgendaPublicaSchema = z.object({
  reservaPublicaHabilitada: z.boolean(),
});

export const passwordChangeSchema = z.object({
  passwordActual: z.string().min(1, "Ingresá tu contraseña actual."),
  passwordNueva: z.string().min(PASSWORD_MIN, `La contraseña nueva debe tener al menos ${PASSWORD_MIN} caracteres.`),
});

export const fotoPerfilSchema = z.object({
  // Primer filtro barato; la validación real (por bytes) y la re-codificación
  // las hace `normalizarFotoPerfil` en la ruta.
  fotoPerfil: z.string().regex(/^data:image\/(png|jpe?g);base64,/, "La foto tiene que ser JPG o PNG."),
});
