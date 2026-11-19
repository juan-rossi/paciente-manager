// Qué otorga un pago único (Preference/Checkout Pro) de MercadoPago.
//
// Lo comprado viaja en la `metadata` de la preferencia, que la crea nuestro
// servidor con el access token: el pagador no la puede alterar, y vuelve en
// el pago que el webhook pide por API. Antes se decidía con
// `user.planPendiente`/`planDuracionPendiente`, que cada checkout pisa aunque
// no se pague -- pagar un link de Básico semestral después de abrir (y
// abandonar) un checkout de Premium bianual otorgaba Premium por 24 meses.
//
// Todo lo que no cierra (monto menor al esperado, upgrade sobre un plan ya
// vencido, pago sin datos de compra) NO otorga nada: el webhook registra el
// pago y lo deja logueado para revisión manual.
import {
  MESES_POR_DURACION,
  precioTotalDuracion,
  type PlanDuracion,
} from "@/lib/plan";

export type PlanTipo = "BASICA" | "PREMIUM";

const PLANES: PlanTipo[] = ["BASICA", "PREMIUM"];
const DURACIONES_PAGO_UNICO: PlanDuracion[] = ["SEMESTRAL", "ANUAL", "MESES_18", "BIANUAL"];
const DURACIONES: PlanDuracion[] = ["MENSUAL", ...DURACIONES_PAGO_UNICO];

// MercadoPago puede redondear centavos; nunca más que esto.
const TOLERANCIA_MONTO = 1;
// El upgrade cubre la diferencia hasta `hasta` (el vencimiento que tenía al
// pedirlo); un margen por zonas horarias / redondeos de fecha.
const TOLERANCIA_HASTA_MS = 24 * 60 * 60 * 1000;

export type Compra =
  | { tipo: "plan"; plan: PlanTipo; duracion: PlanDuracion; monto: number }
  | { tipo: "upgrade"; monto: number | null; hasta: Date | null };

/**
 * Metadata a mandar en la preferencia. Claves en snake_case y valores
 * string: MercadoPago normaliza las claves a snake_case.
 */
export function metadataCompra(compra: Compra): Record<string, string> {
  if (compra.tipo === "plan") {
    return { tipo: "plan", plan: compra.plan, duracion: compra.duracion, monto: String(compra.monto) };
  }
  return {
    tipo: "upgrade",
    ...(compra.monto !== null ? { monto: String(compra.monto) } : {}),
    ...(compra.hasta ? { hasta: compra.hasta.toISOString() } : {}),
  };
}

function texto(valor: unknown): string | null {
  if (typeof valor === "string") return valor.trim();
  if (typeof valor === "number" && Number.isFinite(valor)) return String(valor);
  return null;
}

function numero(valor: unknown): number | null {
  const t = texto(valor);
  if (t === null || t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Lee la compra de la metadata de un pago; `null` si no trae datos válidos. */
export function leerCompra(metadata: Record<string, unknown> | null | undefined): Compra | null {
  if (!metadata) return null;
  const tipo = texto(metadata.tipo)?.toLowerCase();

  if (tipo === "upgrade") {
    const hastaTexto = texto(metadata.hasta);
    const hasta = hastaTexto ? new Date(hastaTexto) : null;
    return {
      tipo: "upgrade",
      monto: numero(metadata.monto),
      hasta: hasta && !Number.isNaN(hasta.getTime()) ? hasta : null,
    };
  }

  if (tipo === "plan") {
    const plan = texto(metadata.plan)?.toUpperCase() as PlanTipo | undefined;
    const duracion = texto(metadata.duracion)?.toUpperCase() as PlanDuracion | undefined;
    const monto = numero(metadata.monto);
    if (!plan || !PLANES.includes(plan)) return null;
    if (!duracion || !DURACIONES.includes(duracion)) return null;
    if (monto === null) return null;
    return { tipo: "plan", plan, duracion, monto };
  }

  return null;
}

/**
 * Pagos de preferencias creadas antes de mandar la compra en la metadata:
 * se infiere por el monto, que es único para cada plan + duración de pago
 * único. Si no coincide exactamente con uno, no se infiere nada.
 */
export function inferirCompraPorMonto(monto: number): Compra | null {
  const candidatos = PLANES.flatMap((plan) =>
    DURACIONES_PAGO_UNICO.map((duracion) => ({ plan, duracion, total: precioTotalDuracion(plan, duracion) }))
  ).filter((c) => Math.abs(c.total - monto) <= TOLERANCIA_MONTO);
  if (candidatos.length !== 1) return null;
  const [c] = candidatos;
  return { tipo: "plan", plan: c.plan, duracion: c.duracion, monto: c.total };
}

export type DecisionPagoUnico =
  | { accion: "otorgar"; plan: PlanTipo; duracion: PlanDuracion; meses: number }
  | { accion: "upgrade" }
  | { accion: "revisar"; motivo: string };

export function resolverPagoUnico(
  pago: { transaction_amount: number; metadata?: Record<string, unknown> | null },
  user: { planEndsAt: Date | null },
  ahora: Date = new Date()
): DecisionPagoUnico {
  const compra =
    leerCompra(pago.metadata) ??
    // Sin metadata de compra (preferencia vieja): solo se acepta lo que se
    // puede deducir sin ambigüedad del monto pagado.
    inferirCompraPorMonto(pago.transaction_amount);
  if (!compra) {
    return { accion: "revisar", motivo: "pago sin datos de compra y monto que no coincide con ningún plan" };
  }

  if (compra.monto !== null && pago.transaction_amount + TOLERANCIA_MONTO < compra.monto) {
    return {
      accion: "revisar",
      motivo: `monto pagado (${pago.transaction_amount}) menor al esperado (${compra.monto})`,
    };
  }

  if (compra.tipo === "upgrade") {
    // El upgrade cobra solo la diferencia por el tiempo que quedaba: no
    // otorga tiempo nuevo. Pagado con el plan ya vencido no hay nada que
    // subir (antes caía en la rama normal y sumaba meses completos).
    if (!user.planEndsAt || user.planEndsAt.getTime() <= ahora.getTime()) {
      return { accion: "revisar", motivo: "upgrade pagado con el plan ya vencido" };
    }
    // Si mientras tanto se pagó otro período, la diferencia cobrada no cubre
    // el vencimiento nuevo.
    if (compra.hasta && user.planEndsAt.getTime() > compra.hasta.getTime() + TOLERANCIA_HASTA_MS) {
      return { accion: "revisar", motivo: "el vencimiento cambió desde que se pidió el upgrade" };
    }
    return { accion: "upgrade" };
  }

  if (compra.duracion === "MENSUAL") {
    // MENSUAL se cobra como suscripción, nunca como pago único.
    return { accion: "revisar", motivo: "pago único con duración MENSUAL" };
  }

  return {
    accion: "otorgar",
    plan: compra.plan,
    duracion: compra.duracion,
    meses: MESES_POR_DURACION[compra.duracion],
  };
}
