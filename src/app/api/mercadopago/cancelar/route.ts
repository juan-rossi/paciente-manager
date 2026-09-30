import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { cancelarPreapproval } from "@/lib/mercadopago";
import { cancelacionSchema } from "@/lib/cancelacion-motivos";

// Cancela la renovación automática -- el médico mantiene acceso hasta
// `planEndsAt` (lo que ya pagó), esto solo corta los cobros futuros.
export async function POST(request: Request) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  // El motivo es opcional y nunca bloquea la cancelación: un body ausente o
  // inválido se trata como "sin motivo".
  const body = await request.json().catch(() => ({}));
  const parsed = cancelacionSchema.safeParse(body);
  const { motivo, detalle } = parsed.success ? parsed.data : {};

  // `mpPreapprovalId` nunca se limpia (solo se reemplaza), así que no basta
  // con chequear que exista -- podría ser el id de una suscripción vieja ya
  // cancelada o de un pago único (que no tiene nada que cancelar).
  if (!user.mpPreapprovalId || user.mpPreapprovalStatus !== "AUTHORIZED") {
    return NextResponse.json({ error: "No tenés una suscripción activa." }, { status: 400 });
  }

  try {
    await cancelarPreapproval(user.mpPreapprovalId);
  } catch {
    return NextResponse.json(
      { error: "No pudimos cancelar la suscripción con MercadoPago. Probá de nuevo en unos minutos." },
      { status: 502 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      mpPreapprovalStatus: "CANCELLED",
      cancelacionMotivo: motivo ?? null,
      cancelacionDetalle: motivo === "OTRO" && detalle ? detalle : null,
      canceladaEl: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
