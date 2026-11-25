import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reservaPublicaInputSchema } from "@/lib/turno-schema";
import { getDoctorParaReserva, buscarSlotValido } from "@/lib/public-booking";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  generarTokenCancelacion,
  nombreCookieTurno,
  opcionesCookieTurno,
} from "@/lib/turno-cancelacion-publica";
import { conAgendaDelMedico } from "@/lib/agenda-lock";

type RouteParams = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;
  const ip = getClientIp(request);

  if (!(await rateLimitOk(ip, slug, "reservar"))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  // `turnstileToken` no es un dato del turno -- se saca aparte antes de
  // validar el resto contra `reservaPublicaInputSchema`, que no lo conoce.
  const turnstileToken =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).turnstileToken === "string"
      ? ((body as Record<string, unknown>).turnstileToken as string)
      : "";
  // Igual que el token: el consentimiento de teleconsulta no es un dato del
  // turno en el schema compartido, se lee aparte.
  const consentimientoRemoto =
    body && typeof body === "object" && (body as Record<string, unknown>).consentimientoRemoto === true;
  const parsed = reservaPublicaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (!(await verifyTurnstileToken(turnstileToken, ip))) {
    return NextResponse.json(
      { error: "No pudimos verificar que sos una persona. Volvé a intentar." },
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
  // un slot realmente libre de la grilla. El `lugarId` del turno sale de
  // acá, nunca del body -- un cliente no autenticado no es una fuente
  // confiable para ese dato.
  const slotValido = await buscarSlotValido(doctor, inicio);
  if (!slotValido) {
    return NextResponse.json({ error: "Ese horario ya no está disponible." }, { status: 409 });
  }

  // Teleconsulta: sin el consentimiento del paciente (Ley 27.553) no se
  // reserva. El tipo sale del lugar del slot, no del body.
  const lugar = await prisma.lugarDeTrabajo.findUnique({
    where: { id: slotValido.lugarId },
    select: { tipo: true },
  });
  const esTeleconsulta = lugar?.tipo === "VIRTUAL";
  if (esTeleconsulta && !consentimientoRemoto) {
    return NextResponse.json(
      { error: "Para una teleconsulta tenés que aceptar la atención por videollamada." },
      { status: 400 }
    );
  }

  const fin = new Date(inicio.getTime() + doctor.slotDurationMinutes * 60_000);

  const patient = parsed.data.dni
    ? await prisma.patient.findFirst({
        where: { doctorId: doctor.id, nroDocumento: parsed.data.dni, deletedAt: null },
        select: { id: true },
      })
    : null;

  const { token, hash } = generarTokenCancelacion();

  // Los chequeos que dependen de otros turnos y el alta van con la agenda
  // del médico tomada: dos pacientes reservando el mismo horario a la vez no
  // pueden quedarse ambos con él (ver `conAgendaDelMedico`).
  const resultado = await conAgendaDelMedico(doctor.id, async (tx) => {
    const existente = await tx.turno.findFirst({
      where: { doctorId: doctor.id, inicio, estado: "CONFIRMADO" },
      select: { id: true },
    });
    if (existente) return { error: "Ese turno ya fue reservado. Elegí otro horario." } as const;

    // Un visitante no autenticado no puede reservar un turno nuevo si ya
    // tiene uno futuro con este médico -- sin esto, alguien con un DNI fijo
    // (real o inventado) podría ocupar muchos horarios distintos en una
    // sola tanda de reservas. No aplica a turnos cargados desde el panel
    // (esos sí pueden acumular varios a propósito, ej. controles seguidos).
    //
    // Va DESPUÉS de validar el horario a propósito: si fuera antes, con un
    // horario inventado se podía preguntar gratis y sin dejar rastro si un
    // DNI ajeno tiene turno con este médico (un dato de salud: "se atiende
    // con un psiquiatra"). Así, cada consulta exige un horario real y libre,
    // y si el DNI no tenía turno se crea una reserva que el médico ve.
    const turnoFuturoDelPaciente = await tx.turno.findFirst({
      where: {
        doctorId: doctor.id,
        dni: parsed.data.dni,
        estado: "CONFIRMADO",
        inicio: { gte: new Date() },
      },
      select: { id: true },
    });
    if (turnoFuturoDelPaciente) {
      return {
        error: "Ya tenés un turno reservado con este médico. Si necesitás cambiarlo, contactalo directamente.",
      } as const;
    }

    const turno = await tx.turno.create({
      data: {
        cancelTokenHash: hash,
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
        lugarId: slotValido.lugarId,
        origen: "ONLINE",
        consentimientoRemotoAt: esTeleconsulta ? new Date() : null,
      },
    });
    return { turno } as const;
  });

  if ("error" in resultado) {
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }
  const { turno } = resultado;

  const res = NextResponse.json(
    { ok: true, inicio: turno.inicio.toISOString(), fin: turno.fin.toISOString() },
    { status: 201 }
  );
  res.cookies.set(nombreCookieTurno(slug), token, opcionesCookieTurno(turno.fin));
  return res;
}
