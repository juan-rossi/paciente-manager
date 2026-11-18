import { NextResponse } from "next/server";
import { requirePremiumDoctor } from "@/lib/ia-auth";
import { limitesDictado } from "@/lib/especialidad";

// El dictado lo consulta antes de empezar a grabar: si el médico ya alcanzó
// su tope mensual de IA, `requirePremiumDoctor` responde 429 y se le avisa
// antes de que dicte, en vez de perder la grabación al subirla. También le
// dice cuánto puede durar la grabación (depende de la especialidad).
export async function GET() {
  const { user, response } = await requirePremiumDoctor();
  if (response) return response;
  return NextResponse.json({
    disponible: true,
    maxSegundos: limitesDictado(user.especialidad).maxGrabacionSegundos,
  });
}
