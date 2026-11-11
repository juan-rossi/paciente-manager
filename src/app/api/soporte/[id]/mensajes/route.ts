import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { respuestaUsuarioInput } from "@/lib/soporte";

type RouteParams = { params: Promise<{ id: string }> };

// El autor contesta dentro de su propio ticket.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = respuestaUsuarioInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const ticket = await prisma.ticketSoporte.findFirst({
    where: { id, autorId: user.id },
    select: { estado: true },
  });
  if (!ticket) return NextResponse.json({ error: "No encontramos ese mensaje." }, { status: 404 });

  // Si contesta algo ya cerrado, se reabre para que el equipo lo vea.
  const cerrado = ticket.estado === "RESUELTO" || ticket.estado === "DESCARTADO";
  await prisma.ticketSoporte.update({
    where: { id },
    data: {
      noLeidoAdmin: true,
      ...(cerrado ? { estado: "EN_REVISION" } : {}),
      mensajes: { create: { autorId: user.id, cuerpo: parsed.data.cuerpo } },
    },
  });

  return NextResponse.json({ ok: true });
}
