import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { lugarTrabajoSchema } from "@/lib/lugar-trabajo-schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const existing = await prisma.lugarDeTrabajo.findFirst({ where: { id, userId: tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = lugarTrabajoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.tipo === "PARTICULAR") {
    const otroParticular = await prisma.lugarDeTrabajo.findFirst({
      where: { userId: tenantId, tipo: "PARTICULAR", deletedAt: null, id: { not: id } },
    });
    if (otroParticular) {
      return NextResponse.json({ error: "Ya tenés un lugar particular cargado." }, { status: 409 });
    }
  }

  const lugar = await prisma.lugarDeTrabajo.update({
    where: { id },
    data: {
      tipo: parsed.data.tipo,
      nombre: parsed.data.nombre,
      direccion: parsed.data.direccion,
      telefono: parsed.data.telefono,
      latitud: parsed.data.latitud ?? null,
      longitud: parsed.data.longitud ?? null,
    },
  });

  return NextResponse.json({ lugar });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const existing = await prisma.lugarDeTrabajo.findFirst({ where: { id, userId: tenantId } });
  if (!existing) {
    return NextResponse.json({ error: "Lugar no encontrado." }, { status: 404 });
  }

  // Los horarios cargados para este lugar siempre se eliminan -- el médico
  // ya no atiende ahí, así que no tiene sentido seguir generando turnos
  // disponibles en ese horario.
  await prisma.workScheduleBlock.deleteMany({ where: { lugarId: id } });

  // Si alguna vez se dio un turno acá (en cualquier estado, pasado o
  // futuro), el lugar nunca se borra de verdad -- solo baja lógica, para
  // no perder la referencia desde esos turnos.
  const turnosCount = await prisma.turno.count({ where: { lugarId: id } });

  if (turnosCount === 0) {
    await prisma.lugarDeTrabajo.delete({ where: { id } });
    return NextResponse.json({ ok: true, softDeleted: false });
  }

  await prisma.lugarDeTrabajo.update({ where: { id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true, softDeleted: true });
}
