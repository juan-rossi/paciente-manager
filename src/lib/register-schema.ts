import { z } from "zod";
import {
  ESPECIALIDAD_VALUES,
  especialidadCompatibleConTitulo,
  type Especialidad,
} from "@/lib/especialidad";
import { TITULO_CORTESIA_VALUES, type TituloCortesia } from "@/lib/titulo-cortesia";

const tituloCortesiaSchema = z.enum(TITULO_CORTESIA_VALUES as [TituloCortesia, ...TituloCortesia[]], {
  message: "Elegí un título.",
});

const especialidadSchema = z.enum(ESPECIALIDAD_VALUES as [Especialidad, ...Especialidad[]], {
  message: "Elegí una especialidad.",
});

// Od./Odont. solo pueden elegir especialidades odontológicas, y el resto solo
// las no odontológicas (el formulario ya filtra; esto lo hace cumplir).
const ESPECIALIDAD_TITULO_MSG = "La especialidad no corresponde al título elegido.";
function especialidadAcordeAlTitulo(d: { tituloCortesia: TituloCortesia; especialidad: Especialidad }) {
  return especialidadCompatibleConTitulo(d.tituloCortesia, d.especialidad);
}

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "El email es obligatorio.").email("Email inválido."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  apellido: z.string().trim().min(1, "El apellido es obligatorio."),
  nroMatricula: z.string().trim().min(1, "El número de matrícula es obligatorio."),
  tituloCortesia: tituloCortesiaSchema,
  especialidad: especialidadSchema,
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  // Plan con el que arranca el período de prueba (ver `TRIAL_DIAS` en
  // src/lib/plan.ts).
  plan: z.enum(["BASICA", "PREMIUM"]).default("BASICA"),
  // Las dos casillas del registro (Términos y declaración profesional) --
  // se validan acá y no solo deshabilitando el botón en el cliente.
  aceptaTerminos: z.literal(true, { message: "Tenés que aceptar los Términos y condiciones." }),
  declaracionProfesional: z.literal(true, {
    message: "Tenés que confirmar la declaración profesional.",
  }),
}).refine(especialidadAcordeAlTitulo, { message: ESPECIALIDAD_TITULO_MSG, path: ["especialidad"] });

export const completeProfileSchema = z.object({
  apellido: z.string().trim().min(1, "El apellido es obligatorio."),
  nroMatricula: z.string().trim().min(1, "El número de matrícula es obligatorio."),
  tituloCortesia: tituloCortesiaSchema,
  especialidad: especialidadSchema,
}).refine(especialidadAcordeAlTitulo, { message: ESPECIALIDAD_TITULO_MSG, path: ["especialidad"] });
