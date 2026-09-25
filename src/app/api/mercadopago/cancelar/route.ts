import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { cancelarPreapproval } from "@/lib/mercadopago";

// Cancela la renovación automática -- el médico mantiene acceso hasta
// `planEndsAt` (lo que ya pagó), esto solo corta los cobros futuros.
export async function POST() {
  const { user, response } = await requireDoctor();
  if (response) return response;

  if (!user.mpPreapprovalId) {
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
    data: { mpPreapprovalStatus: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
