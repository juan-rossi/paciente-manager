import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MESES_POR_DURACION, nuevaFechaFinGracia, type PlanDuracion } from "@/lib/plan";
import {
  obtenerPago,
  obtenerPagoUnico,
  obtenerPreapproval,
  verificarFirmaWebhook,
} from "@/lib/mercadopago";

const PREAPPROVAL_STATUS_MAP: Record<string, "PENDING" | "AUTHORIZED" | "PAUSED" | "CANCELLED"> = {
  pending: "PENDING",
  authorized: "AUTHORIZED",
  paused: "PAUSED",
  cancelled: "CANCELLED",
};

const ESTADOS_PAGO_FALLIDO = ["rejected", "cancelled"];
const VENTANA_PAGO_RECIENTE_MS = 24 * 60 * 60 * 1000;

function nuevoVencimiento(actual: Date | null, meses: number = 1): Date {
  const base = actual && actual.getTime() > Date.now() ? actual : new Date();
  const fin = new Date(base);
  fin.setMonth(fin.getMonth() + meses);
  return fin;
}

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// El recurso `authorized_payment` puede no estar listo todavía en el
// instante exacto en que llega la notificación (404), o existir pero sin
// el sub-objeto `payment` todavía poblado -- MercadoPago lo completa unos
// segundos después de notificar. Reintenta un par de veces antes de darse
// por vencido, en vez de asumir directamente que el pago se rechazó.
async function obtenerPagoConReintentos(dataId: string) {
  const intentos = [0, 1500, 3000];
  for (let i = 0; i < intentos.length; i++) {
    if (intentos[i] > 0) await esperar(intentos[i]);
    try {
      const pago = await obtenerPago(dataId);
      if (pago.payment) return pago;
      if (i === intentos.length - 1) return pago;
    } catch (error) {
      if (i === intentos.length - 1) throw error;
    }
  }
  throw new Error("No se pudo obtener el pago tras reintentar.");
}

// Recibe las notificaciones de MercadoPago para preapprovals (altas/cambios
// de estado de la suscripción) y pagos autorizados (cada cobro recurrente).
// Nunca confía en el payload -- ante cualquier notificación vuelve a pedir
// el recurso por API antes de tocar la base, tal como recomienda
// MercadoPago. Siempre responde rápido (200) aunque el procesamiento
// interno falle, para no generar reintentos infinitos de su lado; la única
// excepción es una firma inválida, que si se rechaza con 401.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  // La documentación de MercadoPago arma el manifest de la firma con el
  // `data.id` tal cual viene en el QUERY STRING de la URL de notificación
  // -- por eso se prioriza acá sobre el del body (que puede no venir, o
  // representar el valor distinto, según el tipo de evento).
  const type: string | null = request.nextUrl.searchParams.get("type") ?? body?.type ?? null;
  const dataId: string | null =
    request.nextUrl.searchParams.get("data.id") ?? body?.data?.id ?? null;

  if (!dataId) {
    return NextResponse.json({ ok: true });
  }

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const firmaValida = verificarFirmaWebhook(xSignature, xRequestId, dataId);
  if (!firmaValida) {
    console.error("Webhook de MercadoPago rechazado por firma inválida", { type, dataId });
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  try {
    if (type === "subscription_preapproval") {
      const preapproval = await obtenerPreapproval(dataId);
      const status = PREAPPROVAL_STATUS_MAP[preapproval.status];
      if (status) {
        // MercadoPago no garantiza el orden de las notificaciones: un
        // "pending" que llega tarde no debe pisar un AUTHORIZED que ya
        // confirmó un cobro aprobado (dejaría el aviso "Confirmando tu
        // suscripción" colgado con el plan ya activo).
        await prisma.user.updateMany({
          where: {
            mpPreapprovalId: preapproval.id,
            ...(status === "PENDING" ? { mpPreapprovalStatus: { not: "AUTHORIZED" } } : {}),
          },
          data: { mpPreapprovalStatus: status },
        });
      }
    } else if (type === "subscription_authorized_payment") {
      const pago = await obtenerPagoConReintentos(dataId);
      if (pago.preapproval_id) {
        const user = await prisma.user.findUnique({ where: { mpPreapprovalId: pago.preapproval_id } });
        if (user) {
          // `pago.status` es el estado del INTENTO de cobro ("processed",
          // no confundir con éxito) -- el resultado real del cobro está en
          // `pago.payment.status`. Si `pago.payment` no está (ni tras
          // reintentar), todavía no sabemos el resultado -- no se toca nada,
          // en vez de asumir un rechazo que puede no ser real.
          if (pago.payment?.status === "approved") {
            const mpPaymentId = String(pago.payment.id);
            const yaRegistrado = await prisma.pagoSuscripcion.findUnique({
              where: { mpPaymentId },
            });
            if (!yaRegistrado) {
              await prisma.$transaction([
                prisma.pagoSuscripcion.create({
                  data: {
                    userId: user.id,
                    mpPaymentId,
                    mpPreapprovalId: pago.preapproval_id,
                    monto: Math.round(pago.transaction_amount),
                    estado: pago.payment.status,
                  },
                }),
                prisma.user.update({
                  where: { id: user.id },
                  data: {
                    plan: user.planPendiente ?? user.plan,
                    planDuracion: user.planDuracionPendiente ?? user.planDuracion,
                    planPendiente: null,
                    planDuracionPendiente: null,
                    planEndsAt: nuevoVencimiento(user.planEndsAt),
                    mpPreapprovalStatus: "AUTHORIZED",
                    pagoEnGracia: false,
                    graciaVenceEl: null,
                  },
                }),
              ]);
            }
          } else if (
            pago.payment &&
            ESTADOS_PAGO_FALLIDO.includes(pago.payment.status) &&
            !user.pagoEnGracia
          ) {
            // Solo un rechazo real inicia la gracia. "pending" / "in_process"
            // son cobros todavía en curso que MercadoPago suele notificar
            // antes de aprobar. Tampoco se abre si hace poco se registró un
            // pago aprobado: es una notificación vieja o fuera de orden.
            const aprobadoReciente = await prisma.pagoSuscripcion.findFirst({
              where: {
                userId: user.id,
                estado: "approved",
                createdAt: { gt: new Date(Date.now() - VENTANA_PAGO_RECIENTE_MS) },
              },
              select: { id: true },
            });
            if (!aprobadoReciente) {
              const graciaVenceEl = nuevaFechaFinGracia();
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  pagoEnGracia: true,
                  graciaVenceEl,
                  planEndsAt:
                    user.planEndsAt && user.planEndsAt > graciaVenceEl
                      ? user.planEndsAt
                      : graciaVenceEl,
                },
              });
            }
          }
        }
      }
    } else if (type === "payment") {
      const pago = await obtenerPagoUnico(dataId);
      // Los cobros de una suscripción recurrente también son "payments" en
      // MercadoPago -- si en algún momento se habilita ese evento a nivel de
      // aplicación, podrían llegar acá también. Esos ya los procesa la rama
      // `subscription_authorized_payment` de arriba; se ignoran acá para no
      // procesarlos dos veces por caminos distintos.
      if (pago.operation_type === "recurring_payment") {
        // no-op
      } else if (pago.status === "approved" && pago.external_reference) {
        const user = await prisma.user.findUnique({ where: { id: pago.external_reference } });
        if (user) {
          const mpPaymentId = String(pago.id);
          const yaRegistrado = await prisma.pagoSuscripcion.findUnique({ where: { mpPaymentId } });
          if (!yaRegistrado) {
            // La duración se resuelve ANTES de limpiar `planDuracionPendiente`
            // -- es la única forma de saber cuántos meses de acceso otorga
            // este pago único (a diferencia del cobro recurrente, que
            // siempre es un mes).
            const esUpgrade =
              pago.metadata?.tipo === "upgrade" &&
              Boolean(user.planEndsAt && user.planEndsAt.getTime() > Date.now());
            const duracion: PlanDuracion = user.planDuracionPendiente ?? user.planDuracion ?? "MENSUAL";
            const meses = MESES_POR_DURACION[duracion];
            await prisma.$transaction([
              prisma.pagoSuscripcion.create({
                data: {
                  userId: user.id,
                  mpPaymentId,
                  mpPreapprovalId: null,
                  monto: Math.round(pago.transaction_amount),
                  estado: pago.status,
                },
              }),
              prisma.user.update({
                where: { id: user.id },
                data: esUpgrade
                  ? {
                      // Upgrade: sube a Premium ya y conserva el vencimiento
                      // y la duración que ya tenía -- lo pagado es solo la
                      // diferencia, no tiempo nuevo.
                      plan: "PREMIUM",
                      planPendiente: null,
                      planDuracionPendiente: null,
                    }
                  : {
                      plan: user.planPendiente ?? user.plan,
                      planDuracion: duracion,
                      planPendiente: null,
                      planDuracionPendiente: null,
                      planEndsAt: nuevoVencimiento(user.planEndsAt, meses),
                      // Un pago aprobado regulariza el cobro fallido: sin esto
                      // el aviso "Reintentar pago" quedaría pegado.
                      pagoEnGracia: false,
                      graciaVenceEl: null,
                    },
              }),
            ]);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error procesando webhook de MercadoPago:", error);
  }

  return NextResponse.json({ ok: true });
}
