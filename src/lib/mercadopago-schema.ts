import { z } from "zod";

export const checkoutSchema = z.object({
  plan: z.enum(["BASICA", "PREMIUM"]),
  duracion: z.enum(["MENSUAL", "SEMESTRAL", "ANUAL", "BIANUAL"]),
});
