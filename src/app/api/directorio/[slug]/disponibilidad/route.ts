import { NextRequest, NextResponse } from "next/server";
import { getDoctorParaReserva, getDisponibilidadPublica } from "@/lib/public-booking";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const doctor = await getDoctorParaReserva(slug);
  if (!doctor) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }

  const dias = await getDisponibilidadPublica(doctor);
  return NextResponse.json({ dias });
}
