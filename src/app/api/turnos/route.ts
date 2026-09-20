import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { turnoInputSchema } from "@/lib/turno-schema";
import { serializeTurno } from "@/lib/turno-serialize";
import { getDaySlots } from "@/lib/get-day-slots";
import { dateParamToDateBA } from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const { user, tenantId, activeLugarId, response } = await requireUser();
  if (response) return response;

  const date = dateParamToDateBA(request.nextUrl.searchParams.get("date") ?? "");
  if (!date) {
    return NextResponse.json({ error: "Parámetro 'date' inválido (YYYY-MM-DD)." }, { status: 400 });
  }

  const result = await getDaySlots(date, user.role, tenantId, activeLugarId);

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const { user, tenantId, activeLugarId, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = turnoInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Una secretaria solo puede agendar en el lugar que tiene activo -- ver
  // `resolveActiveLugarId`. El lugar del turno sale del slot que se clickeó
  // en la grilla (ya viene filtrado a su lugar activo), así que esto es una
  // segunda validación de defensa, no la única barrera.
  if (user.role === "SECRETARY" && (activeLugarId === null || parsed.data.lugarId !== activeLugarId)) {
    return NextResponse.json(
      { error: "No tenés permiso para agendar turnos en ese lugar." },
      { status: 403 }
    );
  }

  const doctor = await prisma.user.findUnique({ where: { id: tenantId } });
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

  if (!parsed.data.esSobreturno) {
    const existente = await prisma.turno.findFirst({
      where: { doctorId: tenantId, inicio, estado: "CONFIRMADO" },
    });
    if (existente) {
      return NextResponse.json({ error: "Ese turno ya fue reservado." }, { status: 409 });
    }
  } else {
    // Solo se permite un sobreturno por horario -- un turno normal más su
    // sobreturno son como mucho 2 filas con el mismo `inicio`.
    const cantidadEnElHorario = await prisma.turno.count({
      where: { doctorId: tenantId, inicio, estado: "CONFIRMADO" },
    });
    if (cantidadEnElHorario >= 2) {
      return NextResponse.json(
        { error: "Ya hay un sobreturno agendado en ese horario." },
        { status: 409 }
      );
    }
  }

  const fin = new Date(inicio.getTime() + doctor.slotDurationMinutes * 60_000);

  const patient = parsed.data.dni
    ? await prisma.patient.findFirst({
        where: { doctorId: tenantId, nroDocumento: parsed.data.dni, deletedAt: null },
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
      doctorId: tenantId,
      lugarId: parsed.data.lugarId ?? null,
    },
  });

  return NextResponse.json({ turno: serializeTurno(turno, user.role) }, { status: 201 });
}
