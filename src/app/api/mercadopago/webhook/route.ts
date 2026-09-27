import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nuevaFechaFinGracia } from "@/lib/plan";
import { obtenerPago, obtenerPreapproval, verificarFirmaWebhook } from "@/lib/mercadopago";

const PREAPPROVAL_STATUS_MAP: Record<string, "PENDING" | "AUTHORIZED" | "PAUSED" | "CANCELLED"> = {
  pending: "PENDING",
  authorized: "AUTHORIZED",
  paused: "PAUSED",
  cancelled: "CANCELLED",
};

function nuevoVencimiento(actual: Date | null): Date {
  const base = actual && actual.getTime() > Date.now() ? actual : new Date();
  const fin = new Date(base);
  fin.setMonth(fin.getMonth() + 1);
  return fin;
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
    // Log temporal para diagnosticar un mismatch de firma real de
    // MercadoPago -- sacar una vez confirmado que las notificaciones se
    // procesan bien (ver conversación del 2026-09-27).
    console.error("Webhook de MercadoPago rechazado por firma inválida", {
      type,
      dataId,
      xSignature,
      xRequestId,
      query: request.nextUrl.search,
    });
    return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
  }

  try {
    if (type === "subscription_preapproval") {
      const preapproval = await obtenerPreapproval(dataId);
      const status = PREAPPROVAL_STATUS_MAP[preapproval.status];
      if (status) {
        await prisma.user.updateMany({
          where: { mpPreapprovalId: preapproval.id },
          data: { mpPreapprovalStatus: status },
        });
      }
    } else if (type === "subscription_authorized_payment") {
      const pago = await obtenerPago(dataId);
      if (pago.preapproval_id) {
        const user = await prisma.user.findUnique({ where: { mpPreapprovalId: pago.preapproval_id } });
        if (user) {
          // `pago.status` es el estado del INTENTO de cobro ("processed",
          // no confundir con éxito) -- el resultado real del cobro está en
          // `pago.payment.status`.
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
          } else if (!user.pagoEnGracia) {
            const graciaVenceEl = nuevaFechaFinGracia();
            await prisma.user.update({
              where: { id: user.id },
              data: {
                pagoEnGracia: true,
                graciaVenceEl,
                planEndsAt:
                  user.planEndsAt && user.planEndsAt > graciaVenceEl ? user.planEndsAt : graciaVenceEl,
              },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error procesando webhook de MercadoPago:", error);
  }

  return NextResponse.json({ ok: true });
}
