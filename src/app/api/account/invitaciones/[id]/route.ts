import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const schema = z.object({ accion: z.enum(["aceptar", "rechazar"]) });

type RouteParams = { params: Promise<{ id: string }> };

// Una secretaria con cuenta propia responde la invitación de un médico que
// la sumó (ver POST /api/users). `id` es el de la `DoctorSecretaria`
// pendiente, y tiene que ser de ella: nadie más puede aceptarla.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireUser();
  if (response) return response;

  if (user.role !== "SECRETARY") {
    return NextResponse.json({ error: "Solo las cuentas de secretaria reciben invitaciones." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { id } = await params;
  const invitacion = await prisma.doctorSecretaria.findFirst({
    where: { id, secretariaId: user.id, aceptadaAt: null },
    select: { id: true, doctorId: true },
  });
  if (!invitacion) {
    return NextResponse.json({ error: "Invitación no encontrada." }, { status: 404 });
  }

  if (parsed.data.accion === "rechazar") {
    await prisma.doctorSecretaria.delete({ where: { id: invitacion.id } });
    return NextResponse.json({ ok: true });
  }

  await prisma.doctorSecretaria.update({
    where: { id: invitacion.id },
    data: { aceptadaAt: new Date() },
  });
  // Si no estaba atendiendo a ningún médico, pasa directo a este.
  if (!user.activeDoctorId) {
    await prisma.user.update({ where: { id: user.id }, data: { activeDoctorId: invitacion.doctorId } });
  }

  return NextResponse.json({ ok: true });
}
