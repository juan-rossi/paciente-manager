import { z } from "zod";

// Motivos que se ofrecen al cancelar la suscripción (ver `plan-settings.tsx`).
// Se guardan como clave en `User.cancelacionMotivo`.
export const CANCELACION_MOTIVOS = {
  MUY_CARO: "Es muy caro",
  POCO_USO: "No lo uso lo suficiente",
  FALTAN_FUNCIONES: "Me faltan funciones",
  OTRA_HERRAMIENTA: "Encontré otra herramienta",
  OTRO: "Otro",
} as const;

export type CancelacionMotivo = keyof typeof CANCELACION_MOTIVOS;

export const CANCELACION_DETALLE_MAX = 300;

// Todo opcional: cancelar no puede depender de que el médico explique por qué.
export const cancelacionSchema = z.object({
  motivo: z.enum(Object.keys(CANCELACION_MOTIVOS) as [CancelacionMotivo, ...CancelacionMotivo[]]).optional(),
  detalle: z.string().trim().max(CANCELACION_DETALLE_MAX).optional(),
});
