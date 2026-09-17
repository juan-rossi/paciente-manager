import { z } from "zod";

const tituloCortesiaSchema = z.enum(["DR", "DRA", "LIC"], {
  message: "Elegí un título.",
});

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "El email es obligatorio.").email("Email inválido."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio."),
  apellido: z.string().trim().min(1, "El apellido es obligatorio."),
  nroMatricula: z.string().trim().min(1, "El número de matrícula es obligatorio."),
  tituloCortesia: tituloCortesiaSchema,
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

export const completeProfileSchema = z.object({
  apellido: z.string().trim().min(1, "El apellido es obligatorio."),
  nroMatricula: z.string().trim().min(1, "El número de matrícula es obligatorio."),
  tituloCortesia: tituloCortesiaSchema,
});
