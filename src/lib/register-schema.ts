import { z } from "zod";
import { ESPECIALIDAD_VALUES, type Especialidad } from "@/lib/especialidad";
import { TITULO_CORTESIA_VALUES, type TituloCortesia } from "@/lib/titulo-cortesia";

const tituloCortesiaSchema = z.enum(TITULO_CORTESIA_VALUES as [TituloCortesia, ...TituloCortesia[]], {
  message: "Elegí un título.",
});

const especialidadSchema = z.enum(ESPECIALIDAD_VALUES as [Especialidad, ...Especialidad[]], {
  message: "Elegí una especialidad.",
});

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
});

export const completeProfileSchema = z.object({
  apellido: z.string().trim().min(1, "El apellido es obligatorio."),
  nroMatricula: z.string().trim().min(1, "El número de matrícula es obligatorio."),
  tituloCortesia: tituloCortesiaSchema,
  especialidad: especialidadSchema,
});
