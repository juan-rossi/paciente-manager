import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { dividirBloqueoExcluyendoLugar } from "@/lib/bloqueo-horario";
import { resolvePuedeBloquearHorarios } from "@/lib/tenant";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, activeLugarId, response } = await requireUser();
  if (response) return response;

  if (!(await resolvePuedeBloquearHorarios(user))) {
    return NextResponse.json(
      { error: "No tenés permiso para desbloquear horarios." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const lugarId = request.nextUrl.searchParams.get("lugarId");

  // Una secretaria solo puede desbloquear un bloqueo de su propio lugar --
  // esto excluye automáticamente un "Día completo" de un médico
  // (`lugarId: null`) o el de otro lugar que ella no administra.
  const existing = await prisma.bloqueoHorario.findFirst({
    where: {
      id,
      userId: tenantId,
      ...(user.role === "SECRETARY" ? { lugarId: activeLugarId } : {}),
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Bloqueo no encontrado." }, { status: 404 });
  }

  // Un "Día completo" (`lugarId: null`) se ve como una card por lugar en la
  // grilla -- si el pedido de desbloqueo viene desde UNA de esas cards
  // (trae `lugarId`) y el bloqueo real todavía aplica a "todos los
  // lugares", solo se libera ESE lugar puntual, no el día entero. Si ya es
  // un bloqueo específico de un lugar (`bloques específicos`, o el "Día
  // completo" acotado de una secretaria), no hay nada que partir: se borra
  // directo, haya venido o no un `lugarId` en el pedido.
  if (lugarId && existing.lugarId === null) {
    await dividirBloqueoExcluyendoLugar(existing, lugarId);
  } else {
    await prisma.bloqueoHorario.delete({ where: { id } });
  }

  return NextResponse.json({ ok: true });
}
