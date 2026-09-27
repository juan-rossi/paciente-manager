import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { checkoutSchema } from "@/lib/mercadopago-schema";
import { cancelarPreapproval, crearPreapproval, crearPreferencia } from "@/lib/mercadopago";

// Arranca (o reemplaza) el cobro de MercadoPago del médico -- lo usan tanto
// "Mi plan" (elegir/cambiar plan) como el signup cuando se elige Premium
// directamente (ver signup-form.tsx). Dos mecanismos según la duración:
// MENSUAL crea una suscripción recurrente (preapproval); el resto, un pago
// único por adelantado (preference) por el total con descuento -- ver
// `src/lib/mercadopago.ts`. Guarda el plan elegido en `planPendiente`/
// `planDuracionPendiente` -- todavía NO en `plan`/`planDuracion` -- porque
// en este paso no hay ningún pago confirmado todavía (el médico puede
// abandonar el checkout de MercadoPago sin pagar). El webhook recién
// promueve `planPendiente` a `plan` cuando llega un pago aprobado.
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

  // Cualquier checkout nuevo reemplaza lo que hubiera antes -- nunca deben
  // quedar dos cobros activos en paralelo (p.ej. pasar de una suscripción
  // mensual activa a un pago único de otra duración). Si había una
  // preapproval PENDING (abandonada) o AUTHORIZED (activa), se cancela acá
  // -- best-effort: si MercadoPago no la deja cancelar, no bloqueamos el
  // nuevo intento por eso. `mpPreapprovalStatus` se pone en CANCELLED acá
  // mismo (optimista) en vez de esperar al webhook de confirmación, para
  // que la UI dependa de este cambio sin ese delay.
  if (user.mpPreapprovalId && (user.mpPreapprovalStatus === "PENDING" || user.mpPreapprovalStatus === "AUTHORIZED")) {
    await cancelarPreapproval(user.mpPreapprovalId).catch(() => {});
    await prisma.user.update({
      where: { id: user.id },
      data: { mpPreapprovalStatus: "CANCELLED" },
    });
  }

  // `request.nextUrl.origin` refleja el host real de la conexión TCP, no el
  // del proxy que la recibió -- detrás de un proxy de confianza (Vercel en
  // producción, o un túnel en desarrollo) el host público real viene en
  // `x-forwarded-host`/`x-forwarded-proto`.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : request.nextUrl.origin;

  const esRecurrente = duracion === "MENSUAL";

  if (esRecurrente) {
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
        planPendiente: plan,
        planDuracionPendiente: duracion,
        mpPreapprovalId: resultado.preapprovalId,
        mpPreapprovalStatus: "PENDING",
      },
    });

    return NextResponse.json({ initPoint: resultado.initPoint });
  }

  let resultado;
  try {
    resultado = await crearPreferencia(user, plan, duracion, origin);
  } catch (error) {
    console.error("Error creando el pago con MercadoPago:", error);
    return NextResponse.json(
      { error: "No pudimos iniciar el pago con MercadoPago. Probá de nuevo en unos minutos." },
      { status: 502 }
    );
  }

  // Pago único: no hay preapproval que guardar -- `mpPreapprovalId`/
  // `mpPreapprovalStatus` quedan como estén (o ya se limpiaron arriba).
  await prisma.user.update({
    where: { id: user.id },
    data: { planPendiente: plan, planDuracionPendiente: duracion },
  });

  return NextResponse.json({ initPoint: resultado.initPoint });
}
