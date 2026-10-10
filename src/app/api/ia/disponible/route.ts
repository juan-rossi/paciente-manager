import { NextResponse } from "next/server";
import { requirePremiumDoctor } from "@/lib/ia-auth";

// El dictado lo consulta antes de empezar a grabar: si el médico ya alcanzó
// su tope mensual de IA, `requirePremiumDoctor` responde 429 y se le avisa
// antes de que dicte, en vez de perder la grabación al subirla.
export async function GET() {
  const { response } = await requirePremiumDoctor();
  if (response) return response;
  return NextResponse.json({ disponible: true });
}
