import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { nuevoTicketInput } from "@/lib/soporte";

// Tope anti-spam por usuario: un uso real no llega ni cerca.
const MAX_TICKETS_POR_HORA = 10;

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  // El ADMIN de plataforma no tiene consultorio: no le escribe al equipo.
  if (user.role === "ADMIN") return NextResponse.json({ error: "No autorizado." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = nuevoTicketInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const recientes = await prisma.ticketSoporte.count({
    where: { autorId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recientes >= MAX_TICKETS_POR_HORA) {
    return NextResponse.json(
      { error: "Mandaste muchos mensajes seguidos. Probá de nuevo en un rato." },
      { status: 429 }
    );
  }

  const { tipo, asunto, cuerpo, pantalla } = parsed.data;
  const ticket = await prisma.ticketSoporte.create({
    data: {
      tipo,
      asunto,
      autorId: user.id,
      doctorId: user.role === "DOCTOR" ? user.id : user.activeDoctorId,
      pantalla: pantalla || null,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
      mensajes: { create: { autorId: user.id, cuerpo } },
    },
    select: { id: true },
  });

  return NextResponse.json({ id: ticket.id }, { status: 201 });
}
