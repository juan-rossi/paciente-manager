import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/request-ip";
import { rateLimitOk } from "@/lib/rate-limit";
import { limpiarAperturasSinTurnos } from "@/lib/horario-excepcional";
import { buscarTurnoPorLinkCodigo, LINK_CODIGO_REGEX } from "@/lib/turno-link-paciente";
import { CANCELACION_ANTELACION_MINUTOS, puedeCancelarOnline } from "@/lib/turno-cancelacion-reglas";

type RouteParams = { params: Promise<{ codigo: string }> };

const bodySchema = z.object({ accion: z.enum(["si", "no"]) });

// El paciente confirma o cancela desde el link del recordatorio. Abrir el
// link (GET de la página) nunca cambia nada -- WhatsApp lo abre solo para
// armar la vista previa --, solo este POST que dispara el botón.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { codigo } = await params;

  if (!(await rateLimitOk(getClientIp(request), codigo, "link-turno"))) {
    return NextResponse.json(
      { error: "Demasiados intentos. Probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !LINK_CODIGO_REGEX.test(codigo)) {
    return NextResponse.json({ error: "Link inválido." }, { status: 400 });
  }

  const turno = await buscarTurnoPorLinkCodigo(codigo);
  if (!turno || turno.estado !== "CONFIRMADO" || turno.inicio <= new Date()) {
    return NextResponse.json({ error: "Este turno ya no se puede modificar." }, { status: 409 });
  }

  if (parsed.data.accion === "si") {
    // `confirmadoAt: null` en el where: confirmar dos veces no pisa la
    // fecha de la primera confirmación.
    await prisma.turno.updateMany({
      where: { id: turno.id, estado: "CONFIRMADO", confirmadoAt: null },
      data: { confirmadoAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (!puedeCancelarOnline(turno.inicio)) {
    return NextResponse.json(
      {
        error: `Ya no se puede cancelar online (hasta ${CANCELACION_ANTELACION_MINUTOS / 60} hora antes del turno). Comunicate con el consultorio.`,
      },
      { status: 409 }
    );
  }

  // Mismo efecto que cancelar desde el perfil público (ver
  // /api/directorio/[slug]/turno): libera el horario y aparece en
  // "Cancelados por pacientes".
  const { count } = await prisma.turno.updateMany({
    where: { id: turno.id, estado: "CONFIRMADO" },
    data: { estado: "CANCELADO", canceladoPorPacienteAt: new Date(), cancelTokenHash: null },
  });
  if (count > 0) await limpiarAperturasSinTurnos(turno.doctorId, turno.lugarId, turno.inicio);

  return NextResponse.json({ ok: true });
}
