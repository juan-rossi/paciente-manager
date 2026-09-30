// Integración con MercadoPago -- dos mecanismos de cobro distintos según la
// duración elegida (ver decisión de diseño del 2026-09-27):
// - MENSUAL: Suscripción recurrente (preapproval), igual que siempre --
//   cobro automático mes a mes, cancelable en cualquier momento.
// - SEMESTRAL/ANUAL/MESES_18/BIANUAL: Pago único por adelantado (Preference/
//   Checkout Pro normal) por el total con descuento -- sin cobro
//   automático nunca más. Esto es lo que hace que elegir una duración larga
//   sea un compromiso real (antes, todas las duraciones facturaban mes a
//   mes y se podía cancelar sin penalidad apenas empezada).
// Ambos usan Checkout Pro -- creamos el recurso sin datos de tarjeta y
// redirigimos al `init_point` que devuelve MercadoPago, así nunca
// manejamos ni tokenizamos una tarjeta de este lado.
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  PLAN_DURACION_LABEL,
  precioMensualEquivalente,
  precioTotalDuracion,
  type PlanDuracion,
} from "@/lib/plan";

const MP_API = "https://api.mercadopago.com";

type PlanTipo = "BASICA" | "PREMIUM";

function requireAccessToken(): string {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado.");
  return accessToken;
}

export type CrearPreapprovalResult = { initPoint: string; preapprovalId: string };

export async function crearPreapproval(
  user: { id: string; email: string },
  plan: PlanTipo,
  duracion: PlanDuracion,
  origin: string,
  // Si ya hay tiempo pagado por delante (recontratación tras cancelar), el
  // primer cobro se difiere a esa fecha para no cobrar dos veces el mismo
  // período.
  inicioCobro?: Date
): Promise<CrearPreapprovalResult> {
  const accessToken = requireAccessToken();

  const response = await fetch(`${MP_API}/preapproval`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      reason: `Semio360 - Plan ${plan === "PREMIUM" ? "Premium" : "Básico"} (${PLAN_DURACION_LABEL[duracion]})`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: precioMensualEquivalente(plan, duracion),
        currency_id: "ARS",
        ...(inicioCobro ? { start_date: inicioCobro.toISOString() } : {}),
      },
      // `pago=retorno` le avisa a la pantalla que el médico acaba de volver
      // del checkout, para mostrar el modal de "pago confirmado" (ver
      // `pago-confirmado-modal.tsx`) -- el modal igual espera la confirmación
      // real del webhook, este parámetro solo dice "empezá a esperarla".
      back_url: `${origin}/configuracion?tab=plan&pago=retorno`,
      payer_email: user.email,
      external_reference: user.id,
      // Explícito acá en vez de depender solo de la config de "Webhooks"
      // del panel (Tus integraciones > Webhooks) -- esa config es a nivel
      // de aplicación entera y quedó pegada más de una vez a una URL vieja
      // (túnel de pruebas ya caído) sin que las suscripciones creadas
      // después se dieran cuenta. Pasándolo acá, cada preapproval apunta
      // siempre a la URL real y actual de la propia app.
      notification_url: `${origin}/api/mercadopago/webhook`,
    }),
  });

  if (!response.ok) {
    const detalle = await response.text().catch(() => "");
    throw new Error(`MercadoPago rechazó la creación de la suscripción (${response.status}): ${detalle}`);
  }

  const data = (await response.json()) as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
  const initPoint = data.init_point ?? data.sandbox_init_point;
  if (!initPoint) throw new Error("MercadoPago no devolvió un link de checkout.");

  return { initPoint, preapprovalId: data.id };
}

export type CrearPreferenciaResult = { initPoint: string; preferenceId: string };

// Pago único por adelantado para duraciones != MENSUAL -- un solo `item`
// por el total con descuento (`precioTotalDuracion`), sin `auto_recurring`.
// `external_reference` es la ÚNICA forma en la que el webhook identifica
// qué médico pagó (no hay un id de suscripción que guardar como con
// `crearPreapproval`). Se excluyen medios de pago offline (`ticket`:
// Rapipago/Pago Fácil/etc.) para que la confirmación llegue en segundos
// como con tarjeta -- si se permitieran, un pago podría quedar "pendiente"
// por días sin que la UI tenga ninguna forma de reflejar eso todavía.
export async function crearPreferencia(
  user: { id: string; email: string },
  plan: PlanTipo,
  duracion: PlanDuracion,
  origin: string
): Promise<CrearPreferenciaResult> {
  const accessToken = requireAccessToken();

  const response = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: `Semio360 - Plan ${plan === "PREMIUM" ? "Premium" : "Básico"} (${PLAN_DURACION_LABEL[duracion]}, pago único)`,
          quantity: 1,
          unit_price: precioTotalDuracion(plan, duracion),
          currency_id: "ARS",
        },
      ],
      payer: { email: user.email },
      external_reference: user.id,
      back_urls: {
        success: `${origin}/configuracion?tab=plan&pago=retorno`,
        failure: `${origin}/configuracion`,
        pending: `${origin}/configuracion`,
      },
      auto_return: "approved",
      notification_url: `${origin}/api/mercadopago/webhook`,
      payment_methods: { excluded_payment_types: [{ id: "ticket" }] },
    }),
  });

  if (!response.ok) {
    const detalle = await response.text().catch(() => "");
    throw new Error(`MercadoPago rechazó la creación del pago (${response.status}): ${detalle}`);
  }

  const data = (await response.json()) as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
  const initPoint = data.init_point ?? data.sandbox_init_point;
  if (!initPoint) throw new Error("MercadoPago no devolvió un link de checkout.");

  return { initPoint, preferenceId: data.id };
}

export type MpPreapproval = {
  id: string;
  status: "pending" | "authorized" | "paused" | "cancelled";
  external_reference?: string | null;
};

// Se usa desde el webhook para no confiar en el payload de la notificación
// -- siempre se vuelve a pedir el recurso por API antes de tocar la base.
export async function obtenerPreapproval(id: string): Promise<MpPreapproval> {
  const accessToken = requireAccessToken();
  const response = await fetch(`${MP_API}/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener el preapproval ${id} (${response.status}).`);
  }
  return response.json();
}

export type MpPagoAutorizado = {
  id: number;
  // Estado del INTENTO de cobro ("processed" | "scheduled" | "cancelled" |
  // ...), no del pago en sí -- ver `payment.status` para eso.
  status: string;
  transaction_amount: number;
  preapproval_id?: string;
  payment?: {
    id: number;
    status: string; // "approved" | "rejected" | "pending" | ...
    status_detail?: string;
  };
};

export async function obtenerPago(id: string): Promise<MpPagoAutorizado> {
  const accessToken = requireAccessToken();
  const response = await fetch(`${MP_API}/authorized_payments/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener el pago ${id} (${response.status}).`);
  }
  return response.json();
}

export type MpPagoUnico = {
  id: number;
  status: string; // "approved" | "rejected" | "pending" | "in_process" | ...
  status_detail?: string;
  transaction_amount: number;
  external_reference?: string | null;
  // "regular_payment" = Checkout Pro normal (lo que nos interesa acá);
  // "recurring_payment" = generado por una suscripción (preapproval) -- una
  // vez habilitado el evento "Pagos" en el panel de MercadoPago, es posible
  // que también notifique estos cobros recurrentes acá. Se ignoran
  // explícitamente: esos ya los procesa `subscription_authorized_payment`
  // más arriba, y procesarlos dos veces por dos caminos distintos sería
  // aventurarse a una condición de carrera innecesaria.
  operation_type?: string;
};

// Para pagos únicos (Preference/Checkout Pro), a diferencia de los cobros
// de una suscripción -- ver `crearPreferencia`.
export async function obtenerPagoUnico(id: string): Promise<MpPagoUnico> {
  const accessToken = requireAccessToken();
  const response = await fetch(`${MP_API}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`No se pudo obtener el pago único ${id} (${response.status}).`);
  }
  return response.json();
}

export async function cancelarPreapproval(id: string): Promise<void> {
  const accessToken = requireAccessToken();
  const response = await fetch(`${MP_API}/preapproval/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ status: "cancelled" }),
  });
  if (!response.ok) {
    throw new Error(`No se pudo cancelar el preapproval ${id} (${response.status}).`);
  }
}

// Valida el header `x-signature` que manda MercadoPago en cada webhook
// (formato "ts=<epoch>,v1=<hmac>"), firmando el mismo manifest que arma su
// documentación: "id:{data.id};request-id:{x-request-id};ts:{ts};" con
// MERCADOPAGO_WEBHOOK_SECRET. El id va en minúsculas -- MercadoPago lo pide
// así cuando el id trae letras.
export function verificarFirmaWebhook(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    // Fail-closed en producción -- sin secret no hay forma de validar que
    // la notificación viene realmente de MercadoPago. Fuera de producción
    // no bloquea, para poder probar el webhook en local armando el payload
    // a mano (localhost no es alcanzable por MercadoPago de todos modos).
    return process.env.NODE_ENV !== "production";
  }
  if (!xSignature || !xRequestId) return false;

  const partes = Object.fromEntries(
    xSignature.split(",").map((par) => {
      const [key, value] = par.split("=");
      return [key?.trim(), value?.trim() ?? ""];
    })
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`;
  const esperado = createHmac("sha256", secret).update(manifest).digest("hex");

  const recibido = Buffer.from(v1);
  const calculado = Buffer.from(esperado);
  return recibido.length === calculado.length && timingSafeEqual(recibido, calculado);
}
