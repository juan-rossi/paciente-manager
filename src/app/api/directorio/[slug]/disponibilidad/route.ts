import { NextRequest, NextResponse } from "next/server";
import { getDoctorParaReserva, getDisponibilidadPublica } from "@/lib/public-booking";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const ip = getClientIp(request);

  // Solo lectura (sin captcha acá -- se navega varias veces por día al
  // mirar el calendario, agregar un desafío en cada vista sería mala UX).
  // Límite más generoso que "reservar", solo para frenar scraping/DoS
  // trivial -- ver src/lib/rate-limit.ts.
  if (!(await rateLimitOk(ip, slug, "disponibilidad"))) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

  const doctor = await getDoctorParaReserva(slug);
  if (!doctor) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }

  const dias = await getDisponibilidadPublica(doctor);
  return NextResponse.json({ dias });
}
