import { z } from "zod";

export const checkoutSchema = z.object({
  plan: z.enum(["BASICA", "PREMIUM"]),
  duracion: z.enum(["MENSUAL", "SEMESTRAL", "ANUAL", "MESES_18", "BIANUAL"]),
  // Upgrade de Básico a Premium sobre un pago único vigente: el monto lo
  // calcula el servidor (`calcularUpgradePremium`), el cliente solo lo pide.
  upgrade: z.boolean().optional(),
});
