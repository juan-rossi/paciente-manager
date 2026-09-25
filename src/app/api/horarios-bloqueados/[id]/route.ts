import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { dividirBloqueoExcluyendoRango } from "@/lib/bloqueo-horario";
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
  const inicioParam = request.nextUrl.searchParams.get("inicio");
  const finParam = request.nextUrl.searchParams.get("fin");

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

  // `lugarId` + `inicio`/`fin` vienen siempre que el pedido salga de una
  // card puntual de la grilla (el único camino que tiene hoy la UI) -- ese
  // rango es el del TRAMO CONTIGUO visible en esa card, nunca necesariamente
  // el rango completo de la fila real (ver `dividirBloqueoExcluyendoRango`).
  // Sin esos 3 datos (ej. un llamado antiguo/externo) se borra la fila
  // entera, como siempre.
  if (lugarId && inicioParam && finParam) {
    const inicio = new Date(inicioParam);
    const fin = new Date(finParam);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
      return NextResponse.json({ error: "Rango horario inválido." }, { status: 400 });
    }
    await dividirBloqueoExcluyendoRango(existing, lugarId, { inicio, fin });
  } else {
    await prisma.bloqueoHorario.delete({ where: { id } });
  }

  return NextResponse.json({ ok: true });
}
