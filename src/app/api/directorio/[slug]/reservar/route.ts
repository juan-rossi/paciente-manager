import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { turnoInputSchema } from "@/lib/turno-schema";
import { getDoctorParaReserva, esHorarioValido } from "@/lib/public-booking";

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  const body = await request.json().catch(() => null);
  const parsed = turnoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const doctor = await getDoctorParaReserva(slug);
  if (!doctor) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }

  const inicio = new Date(parsed.data.inicio);
  if (Number.isNaN(inicio.getTime())) {
    return NextResponse.json({ error: "Fecha y hora inválidas." }, { status: 400 });
  }
  if (inicio.getTime() < Date.now()) {
    return NextResponse.json({ error: "Elegí un horario futuro." }, { status: 400 });
  }

  // Una reserva pública nunca puede ser un sobreturno -- solo puede ocupar
  // un slot realmente libre de la grilla (ver esHorarioValido más abajo).
  const esValido = await esHorarioValido(doctor, inicio);
  if (!esValido) {
    return NextResponse.json({ error: "Ese horario ya no está disponible." }, { status: 409 });
  }

  const existente = await prisma.turno.findFirst({
    where: { doctorId: doctor.id, inicio, estado: "CONFIRMADO" },
  });
  if (existente) {
    return NextResponse.json(
      { error: "Ese turno ya fue reservado. Elegí otro horario." },
      { status: 409 }
    );
  }

  const fin = new Date(inicio.getTime() + doctor.slotDurationMinutes * 60_000);

  const patient = parsed.data.dni
    ? await prisma.patient.findFirst({
        where: { doctorId: doctor.id, nroDocumento: parsed.data.dni, deletedAt: null },
        select: { id: true },
      })
    : null;

  const turno = await prisma.turno.create({
    data: {
      inicio,
      fin,
      nombreYApellido: parsed.data.nombreYApellido,
      fechaNacimiento: parsed.data.fechaNacimiento ? new Date(parsed.data.fechaNacimiento) : null,
      dni: parsed.data.dni,
      telefono: parsed.data.telefono,
      obraSocial: parsed.data.obraSocial,
      obraSocialNro: parsed.data.obraSocialNro,
      patientId: patient?.id ?? null,
      creadoPorId: doctor.id,
      doctorId: doctor.id,
    },
  });

  return NextResponse.json(
    { ok: true, inicio: turno.inicio.toISOString(), fin: turno.fin.toISOString() },
    { status: 201 }
  );
}
