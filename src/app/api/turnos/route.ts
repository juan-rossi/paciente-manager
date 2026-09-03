import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { turnoInputSchema } from "@/lib/turno-schema";
import { serializeTurno } from "@/lib/turno-serialize";
import { getDaySlots } from "@/lib/get-day-slots";
import { dateParamToDateBA } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const date = dateParamToDateBA(request.nextUrl.searchParams.get("date") ?? "");
  if (!date) {
    return NextResponse.json({ error: "Parámetro 'date' inválido (YYYY-MM-DD)." }, { status: 400 });
  }

  const result = await getDaySlots(date, user.role);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = turnoInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const doctor = await prisma.user.findFirst({ where: { role: "DOCTOR" } });
  if (!doctor) {
    return NextResponse.json(
      { error: "Todavía no se configuró el horario de trabajo." },
      { status: 409 }
    );
  }

  const inicio = new Date(parsed.data.inicio);
  if (Number.isNaN(inicio.getTime())) {
    return NextResponse.json({ error: "Fecha y hora inválidas." }, { status: 400 });
  }

  const existente = await prisma.turno.findFirst({
    where: { inicio, estado: "CONFIRMADO" },
  });
  if (existente) {
    return NextResponse.json({ error: "Ese turno ya fue reservado." }, { status: 409 });
  }

  const fin = new Date(inicio.getTime() + doctor.slotDurationMinutes * 60_000);

  const patient = parsed.data.dni
    ? await prisma.patient.findFirst({
        where: { nroDocumento: parsed.data.dni },
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
      creadoPorId: user.id,
    },
  });

  return NextResponse.json({ turno: serializeTurno(turno, user.role) }, { status: 201 });
}
