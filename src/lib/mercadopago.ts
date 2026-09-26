// Integración con las Suscripciones (preapproval) de MercadoPago. Usa
// Checkout Pro -- creamos el preapproval sin datos de tarjeta y
// redirigimos al `init_point` que devuelve MercadoPago, así nunca
// manejamos ni tokenizamos una tarjeta de este lado. Todas las duraciones
// se facturan mes a mes (`frequency: 1, frequency_type: "months"`): el
// preapproval de MercadoPago no soporta un ciclo de 24 meses (Bianual), y
// la duración elegida solo determina qué precio mensual paga el médico
// (ver `precioMensualEquivalente` en `src/lib/plan.ts`), no un ciclo de
// cobro propio.
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  PLAN_DURACION_LABEL,
  precioMensualEquivalente,
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
  origin: string
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
      },
      back_url: `${origin}/configuracion`,
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
