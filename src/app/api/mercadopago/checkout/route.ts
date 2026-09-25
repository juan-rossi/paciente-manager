import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { checkoutSchema } from "@/lib/mercadopago-schema";
import { crearPreapproval } from "@/lib/mercadopago";

// Arranca (o reemplaza) la suscripción de MercadoPago del médico -- lo usan
// tanto "Mi plan" (elegir/cambiar plan) como el signup cuando se elige
// Premium directamente (ver signup-form.tsx). Guarda `plan`/`planDuracion`
// ya en este paso (todavía sin confirmar por pago) para no tener que
// reconstruirlos desde el webhook más adelante.
export async function POST(request: NextRequest) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { plan, duracion } = parsed.data;

  // `request.nextUrl.origin` refleja el host real de la conexión TCP, no el
  // del proxy que la recibió -- detrás de un proxy de confianza (Vercel en
  // producción, o un túnel en desarrollo) el host público real viene en
  // `x-forwarded-host`/`x-forwarded-proto`.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;

  let resultado;
  try {
    resultado = await crearPreapproval(user, plan, duracion, origin);
  } catch (error) {
    console.error("Error creando la suscripción con MercadoPago:", error);
    return NextResponse.json(
      { error: "No pudimos iniciar la suscripción con MercadoPago. Probá de nuevo en unos minutos." },
      { status: 502 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan,
      planDuracion: duracion,
      mpPreapprovalId: resultado.preapprovalId,
      mpPreapprovalStatus: "PENDING",
    },
  });

  return NextResponse.json({ initPoint: resultado.initPoint });
}
