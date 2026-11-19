import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { turnoInputSchema } from "@/lib/turno-schema";
import { serializeTurno } from "@/lib/turno-serialize";
import { getDaySlots } from "@/lib/get-day-slots";
import { getTurnosCanceladosPorPacientes } from "@/lib/turnos-cancelados-por-pacientes";
import { dateParamToDateBA, startOfDayBA } from "@/lib/timezone";
import { isRangoBloqueado } from "@/lib/bloqueo-horario";
import { conAgendaDelMedico } from "@/lib/agenda-lock";

export async function GET(request: NextRequest) {
  const { user, tenantId, activeLugarId, response } = await requireUser();
  if (response) return response;

  const date = dateParamToDateBA(request.nextUrl.searchParams.get("date") ?? "");
  if (!date) {
    return NextResponse.json({ error: "Parámetro 'date' inválido (YYYY-MM-DD)." }, { status: 400 });
  }

  const [result, canceladosPorPacientes] = await Promise.all([
    getDaySlots(date, user.role, tenantId, activeLugarId),
    getTurnosCanceladosPorPacientes(date, tenantId, activeLugarId),
  ]);

  return NextResponse.json({ ...result, canceladosPorPacientes });
}

export async function POST(request: NextRequest) {
  const { user, tenantId, activeLugarId, response } = await requireUser({ escritura: true });
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

  // El lugar tiene que ser de este médico y estar vigente, también cuando
  // agenda el propio médico: un `lugarId` ajeno mostraría el consultorio de
  // otro médico en el link del recordatorio al paciente.
  const lugarValido = await prisma.lugarDeTrabajo.count({
    where: { id: parsed.data.lugarId, userId: tenantId, deletedAt: null },
  });
  if (!lugarValido) {
    return NextResponse.json({ error: "El lugar no es válido." }, { status: 400 });
  }

  const inicio = new Date(parsed.data.inicio);
  if (Number.isNaN(inicio.getTime())) {
    return NextResponse.json({ error: "Fecha y hora inválidas." }, { status: 400 });
  }

  // Un bloqueo frena cualquier turno nuevo en ese rango, sobreturno
  // incluido -- por eso este chequeo va antes de separar ambos casos.
  const dayStart = startOfDayBA(inicio);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const bloqueos = await prisma.bloqueoHorario.findMany({
    where: { userId: tenantId, inicio: { lt: dayEnd }, fin: { gt: dayStart } },
  });
  if (isRangoBloqueado(inicio, parsed.data.lugarId, bloqueos)) {
    return NextResponse.json({ error: "Ese horario está bloqueado." }, { status: 409 });
  }

  const fin = new Date(inicio.getTime() + doctor.slotDurationMinutes * 60_000);

  const patient = parsed.data.dni
    ? await prisma.patient.findFirst({
        where: { doctorId: tenantId, nroDocumento: parsed.data.dni, deletedAt: null },
        select: { id: true },
      })
    : null;

  // "¿Está libre?" y "crearlo" con la agenda del médico tomada: dos altas
  // simultáneas no pueden tomar el mismo horario (ver `conAgendaDelMedico`).
  const resultado = await conAgendaDelMedico(tenantId, async (tx) => {
    const cantidadEnElHorario = await tx.turno.count({
      where: { doctorId: tenantId, inicio, estado: "CONFIRMADO" },
    });
    if (!parsed.data.esSobreturno && cantidadEnElHorario > 0) {
      return { error: "Ese turno ya fue reservado." } as const;
    }
    // Solo se permite un sobreturno por horario -- un turno normal más su
    // sobreturno son como mucho 2 filas con el mismo `inicio`.
    if (parsed.data.esSobreturno && cantidadEnElHorario >= 2) {
      return { error: "Ya hay un sobreturno agendado en ese horario." } as const;
    }

    const turno = await tx.turno.create({
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
        lugarId: parsed.data.lugarId,
      },
    });
    return { turno } as const;
  });

  if ("error" in resultado) {
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }
  return NextResponse.json({ turno: serializeTurno(resultado.turno, user.role) }, { status: 201 });
}
