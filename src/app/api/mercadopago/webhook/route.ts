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
  const type: string | null = body?.type ?? request.nextUrl.searchParams.get("type");
  const dataId: string | null = body?.data?.id ?? request.nextUrl.searchParams.get("data.id");

  if (!dataId) {
    return NextResponse.json({ ok: true });
  }

  const firmaValida = verificarFirmaWebhook(
    request.headers.get("x-signature"),
    request.headers.get("x-request-id"),
    dataId
  );
  if (!firmaValida) {
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
