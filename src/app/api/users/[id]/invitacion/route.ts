import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { enviarInvitacion } from "@/lib/invitacion-secretaria";
import { getSiteUrl } from "@/lib/site-url";

type RouteParams = { params: Promise<{ id: string }> };

// Reenvía el mail de invitación a una secretaria que todavía no la aceptó
// (p.ej. se le venció el link o no le llegó). Genera un token nuevo, así
// que el link anterior deja de servir.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;
  const invitacion = await prisma.doctorSecretaria.findFirst({
    where: { doctorId: tenantId, secretariaId: id, aceptadaAt: null },
    select: { id: true },
  });
  if (!invitacion) {
    return NextResponse.json({ error: "No hay una invitación pendiente para esa secretaria." }, { status: 404 });
  }

  const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;
  try {
    await enviarInvitacion(invitacion.id, baseUrl);
  } catch (error) {
    console.error("[invitacion-secretaria] no se pudo reenviar el mail", error);
    return NextResponse.json({ error: "No se pudo enviar el mail. Probá de nuevo en un rato." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
