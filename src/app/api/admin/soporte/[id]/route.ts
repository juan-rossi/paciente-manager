import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { enviarMailRespuestaSoporte, respuestaAdminInput } from "@/lib/soporte";

type RouteParams = { params: Promise<{ id: string }> };

// Respuesta del equipo, nota interna y/o cambio de estado, en una sola acción.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = respuestaAdminInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const ticket = await prisma.ticketSoporte.findUnique({
    where: { id },
    select: { asunto: true, autor: { select: { email: true, nombre: true } } },
  });
  if (!ticket) return NextResponse.json({ error: "El ticket ya no existe." }, { status: 404 });

  const { cuerpo, interno, estado } = parsed.data;
  const hayMensaje = Boolean(cuerpo);
  const esRespuesta = hayMensaje && !interno;

  await prisma.ticketSoporte.update({
    where: { id },
    data: {
      ...(estado ? { estado } : {}),
      noLeidoAdmin: false,
      // Una nota interna no le avisa nada al autor.
      ...(esRespuesta ? { noLeidoAutor: true } : {}),
      ...(hayMensaje
        ? { mensajes: { create: { autorId: user.id, esEquipo: true, interno, cuerpo: cuerpo! } } }
        : {}),
    },
  });

  if (esRespuesta && ticket.autor.email) {
    after(() =>
      enviarMailRespuestaSoporte({
        email: ticket.autor.email,
        nombre: ticket.autor.nombre,
        ticketId: id,
        asunto: ticket.asunto,
        respuesta: cuerpo!,
      })
    );
  }

  return NextResponse.json({ ok: true });
}
