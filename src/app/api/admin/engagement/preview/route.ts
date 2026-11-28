import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { MAIL_ENGAGEMENT_TIPOS, type MailEngagementTipo } from "@/lib/engagement";
import { mailEngagement } from "@/lib/engagement-emails";
import { remitenteFundador } from "@/lib/engagement-server";

const DIA_MS = 24 * 60 * 60 * 1000;

// Vista previa de un mail de activación con datos de ejemplo, para /admin
// (Marketing › Mails de activación). `?formato=texto` muestra la versión en
// texto plano.
export async function GET(request: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  const tipo = request.nextUrl.searchParams.get("tipo") as MailEngagementTipo;
  if (!MAIL_ENGAGEMENT_TIPOS.includes(tipo)) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }
  const plan = request.nextUrl.searchParams.get("plan") === "PREMIUM" ? "PREMIUM" : "BASICA";
  const ahora = new Date();
  // Fin de trial coherente con cada mail (para que los días del texto tengan sentido).
  const diasParaFin: Partial<Record<MailEngagementTipo, number>> = {
    TRIAL_TERMINA_PRONTO: 7,
    TRIAL_TERMINA_MANANA: 1,
    TRIAL_VENCIDO: -3,
  };
  const trialEndsAt = new Date(ahora.getTime() + (diasParaFin[tipo] ?? (plan === "PREMIUM" ? 15 : 40)) * DIA_MS);

  const mail = mailEngagement(
    tipo,
    { nombre: "Ana", apellido: "Pérez", tituloCortesia: "DRA", plan, trialEndsAt },
    {
      baseUrl: request.nextUrl.origin,
      urlBaja: `${request.nextUrl.origin}/mails/baja`,
      fundadorNombre: remitenteFundador()?.nombre ?? "[EMAIL_FUNDADOR_NOMBRE]",
    },
    ahora
  );

  if (request.nextUrl.searchParams.get("formato") === "texto") {
    return new NextResponse(`Asunto: ${mail.subject}\n\n${mail.text}`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new NextResponse(mail.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
