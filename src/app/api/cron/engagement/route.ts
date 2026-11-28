import { NextRequest, NextResponse } from "next/server";
import { correrEngagement } from "@/lib/engagement-server";
import { getSiteUrl } from "@/lib/site-url";

export const maxDuration = 300;

// Cron diario (ver `crons` en vercel.json) de los mails de activación del
// trial (ver src/lib/engagement.ts). Con ENGAGEMENT_EMAILS apagado corre en
// modo prueba: devuelve a quién le mandaría qué, sin mandar nada.
// Vercel llama con `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/engagement] Falta CRON_SECRET");
    return NextResponse.json({ error: "Cron sin configurar." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;
  try {
    const resultado = await correrEngagement(baseUrl);
    console.log(
      `[cron/engagement] modo=${resultado.modo} candidatos=${resultado.candidatos} enviados=${resultado.enviados} errores=${resultado.errores}`,
      resultado.detalle
    );
    return NextResponse.json(resultado);
  } catch (error) {
    console.error("[cron/engagement]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error" }, { status: 500 });
  }
}
