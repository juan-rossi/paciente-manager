import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDoctorParaReserva } from "@/lib/public-booking";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";
import { limpiarAperturasSinTurnos } from "@/lib/horario-excepcional";
import { buscarTurnoPorToken, nombreCookieTurno } from "@/lib/turno-cancelacion-publica";
import { CANCELACION_ANTELACION_MINUTOS, puedeCancelarOnline } from "@/lib/turno-cancelacion-reglas";

type RouteParams = { params: Promise<{ slug: string }> };

// El visitante cancela SU turno: se identifica solo por la cookie que le
// dejó `reservar`, nunca por un id en el body.
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { slug } = await params;

  if (!(await rateLimitOk(getClientIp(request), slug, "cancelar"))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

  const doctor = await getDoctorParaReserva(slug);
  if (!doctor) {
    return NextResponse.json({ error: "Médico no encontrado." }, { status: 404 });
  }

  const token = request.cookies.get(nombreCookieTurno(slug))?.value;
  const turno = token ? await buscarTurnoPorToken(doctor.id, token) : null;
  if (!turno) {
    const res = NextResponse.json({ error: "No encontramos un turno para cancelar." }, { status: 404 });
    res.cookies.delete(nombreCookieTurno(slug));
    return res;
  }

  if (!puedeCancelarOnline(turno.inicio)) {
    return NextResponse.json(
      {
        error: `Ya no se puede cancelar online (hasta ${CANCELACION_ANTELACION_MINUTOS / 60} hora antes del turno). Contactá al médico directamente.`,
      },
      { status: 409 }
    );
  }

  // `updateMany` con el estado en el where evita cancelar dos veces si el
  // visitante hace doble click. Al volverse CANCELADO el horario queda
  // libre en la agenda (todo lo demás filtra por CONFIRMADO).
  const { count } = await prisma.turno.updateMany({
    where: { id: turno.id, estado: "CONFIRMADO" },
    data: { estado: "CANCELADO", canceladoPorPacienteAt: new Date(), cancelTokenHash: null },
  });
  if (count === 0) {
    return NextResponse.json({ error: "El turno ya estaba cancelado." }, { status: 409 });
  }

  const cancelado = await prisma.turno.findUniqueOrThrow({
    where: { id: turno.id },
    select: { doctorId: true, lugarId: true, inicio: true },
  });
  await limpiarAperturasSinTurnos(cancelado.doctorId, cancelado.lugarId, cancelado.inicio);

  const res = NextResponse.json({ ok: true });
  res.cookies.delete(nombreCookieTurno(slug));
  return res;
}
