import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { reconciliarPreapprovalPendiente } from "@/lib/mp-reconciliar";

export const dynamic = "force-dynamic";

// Lo consulta el modal "Pago confirmado" (ver `pago-confirmado-modal.tsx`)
// al volver del checkout de MercadoPago: el redirect no prueba que el pago
// se haya aprobado -- la confirmación real es la fila de `PagoSuscripcion`
// que crea el webhook (en la misma transacción que actualiza el plan). Acá
// se devuelve la última, junto con el plan resultante para armar el resumen.
export async function GET() {
  const { user, response } = await requireDoctor();
  if (response) return response;

  if (user.mpPreapprovalStatus === "PENDING" && user.mpPreapprovalId) {
    await reconciliarPreapprovalPendiente(user.id, user.mpPreapprovalId);
  }

  const [ultimoPago, cuenta] = await Promise.all([
    prisma.pagoSuscripcion.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true, planDuracion: true, planEndsAt: true },
    }),
  ]);

  return NextResponse.json({
    ultimoPago: ultimoPago
      ? { id: ultimoPago.id, createdAt: ultimoPago.createdAt.toISOString() }
      : null,
    plan: cuenta?.plan ?? null,
    planDuracion: cuenta?.planDuracion ?? null,
    planEndsAt: cuenta?.planEndsAt?.toISOString() ?? null,
  });
}
