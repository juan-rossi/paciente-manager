import { z } from "zod";
import { CARAS, PIEZAS_VALIDAS, type Cara } from "@/lib/odontograma";
import { ordenarCaras } from "@/lib/practica-odontologica";

// Presupuestos del plan de tratamiento odontológico (ver
// PresupuestoOdontologico en prisma/schema.prisma) y aranceles particulares
// del odontólogo por práctica del nomenclador.

export const PRESUPUESTO_ESTADOS = ["PENDIENTE", "ACEPTADO", "RECHAZADO"] as const;
export type PresupuestoEstado = (typeof PRESUPUESTO_ESTADOS)[number];

export const PRESUPUESTO_ESTADO_LABELS: Record<PresupuestoEstado, string> = {
  PENDIENTE: "Pendiente",
  ACEPTADO: "Aceptado",
  RECHAZADO: "Rechazado",
};

// Tope de un monto: evita errores de tipeo absurdos (y el overflow del Int de
// Postgres al sumar).
export const MONTO_MAXIMO = 100_000_000;
const montoSchema = z.number().int("El monto va sin centavos.").min(0).max(MONTO_MAXIMO);

const piezaSchema = z
  .string()
  .nullable()
  .refine((p) => p === null || PIEZAS_VALIDAS.has(p), "Pieza inválida.");

// Mismas reglas de pieza/caras que una práctica de la visita
// (practicaVisitaInputSchema), más el monto.
export const presupuestoItemInputSchema = z
  .object({
    practicaId: z.string().min(1),
    pieza: piezaSchema,
    caras: z.array(z.enum(CARAS)).max(CARAS.length).default([]),
    monto: montoSchema,
  })
  .refine((d) => d.pieza !== null || d.caras.length === 0, {
    message: "Las caras solo se cargan con una pieza.",
  });

export const presupuestoInputSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
  nota: z.string().trim().max(2000).optional().nullable(),
  items: z
    .array(presupuestoItemInputSchema)
    .min(1, "Agregá al menos una práctica.")
    .max(100, "Demasiadas prácticas en un solo presupuesto."),
});

export const presupuestoEstadoInputSchema = z.object({
  estado: z.enum(PRESUPUESTO_ESTADOS),
});

export const arancelInputSchema = z.object({
  practicaId: z.string().min(1),
  // null borra el arancel.
  monto: montoSchema.nullable(),
});

export type PresupuestoItemValue = {
  id: string;
  practicaId: string;
  codigo: string;
  descripcion: string;
  pieza: string | null;
  caras: Cara[];
  monto: number;
};

export type PresupuestoValue = {
  id: string;
  fecha: string;
  estado: PresupuestoEstado;
  nota: string | null;
  items: PresupuestoItemValue[];
  deletedAt: string | null;
};

export function presupuestoFromDb(p: {
  id: string;
  fecha: Date;
  estado: PresupuestoEstado;
  nota: string | null;
  deletedAt: Date | null;
  items: {
    id: string;
    practicaId: string;
    codigo: string;
    descripcion: string;
    pieza: string | null;
    caras: string[];
    monto: number;
    orden: number;
  }[];
}): PresupuestoValue {
  return {
    id: p.id,
    fecha: p.fecha.toISOString().slice(0, 10),
    estado: p.estado,
    nota: p.nota,
    deletedAt: p.deletedAt ? p.deletedAt.toISOString() : null,
    items: [...p.items]
      .sort((a, b) => a.orden - b.orden)
      .map((i) => ({
        id: i.id,
        practicaId: i.practicaId,
        codigo: i.codigo,
        descripcion: i.descripcion,
        pieza: i.pieza,
        caras: ordenarCaras(i.caras),
        monto: i.monto,
      })),
  };
}

export function calcularTotal(items: readonly { monto: number }[]): number {
  return items.reduce((total, i) => total + i.monto, 0);
}

const FORMATO_PESOS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatPesos(monto: number): string {
  return FORMATO_PESOS.format(monto);
}

// "36 · O D" / "Boca completa".
export function describirUbicacion(item: { pieza: string | null; caras: readonly string[] }): string {
  if (!item.pieza) return "Boca completa";
  return item.caras.length > 0 ? `${item.pieza} · ${item.caras.join(" ")}` : item.pieza;
}
