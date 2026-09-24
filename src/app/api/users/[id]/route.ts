import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { secretaryUpdateSchema } from "@/lib/turno-schema";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const existing = await prisma.user.findFirst({
    where: { id, role: "SECRETARY", secretariaAsignaciones: { some: { doctorId: tenantId } } },
    include: { secretariaAsignaciones: { where: { doctorId: tenantId } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Secretaria no encontrada." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = secretaryUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (emailTaken) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email." }, { status: 409 });
    }
  }

  const lugaresValidos = await prisma.lugarDeTrabajo.count({
    where: { id: { in: parsed.data.lugarIds }, userId: tenantId, deletedAt: null },
  });
  if (lugaresValidos !== parsed.data.lugarIds.length) {
    return NextResponse.json({ error: "Uno de los lugares seleccionados no es válido." }, { status: 400 });
  }

  const secretaria = await prisma.user.update({
    where: { id },
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      ...(parsed.data.password ? { passwordHash: await hashPassword(parsed.data.password) } : {}),
    },
    select: { id: true, email: true, nombre: true, createdAt: true },
  });

  const doctorSecretariaId = existing.secretariaAsignaciones[0].id;
  await prisma.doctorSecretaria.update({
    where: { id: doctorSecretariaId },
    data: { puedeBloquearHorarios: parsed.data.puedeBloquearHorarios },
  });
  await prisma.doctorSecretariaLugar.deleteMany({ where: { doctorSecretariaId } });
  await prisma.doctorSecretariaLugar.createMany({
    data: parsed.data.lugarIds.map((lugarId) => ({ doctorSecretariaId, lugarId })),
  });

  return NextResponse.json({
    secretaria: {
      ...secretaria,
      lugarIds: parsed.data.lugarIds,
      puedeBloquearHorarios: parsed.data.puedeBloquearHorarios,
    },
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  // Esta secretaria puede asistir a más de un médico -- acá solo se quita la
  // asignación a la cuenta de este médico, nunca se borra la cuenta.
  const { count } = await prisma.doctorSecretaria.deleteMany({
    where: { doctorId: tenantId, secretariaId: id },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Secretaria no encontrada." }, { status: 404 });
  }

  // Si tenía a este médico como el activo, hay que reasignarla a otro de los
  // que le queden (o dejarla sin médico activo si no le queda ninguno).
  const secretaria = await prisma.user.findUnique({ where: { id } });
  if (secretaria?.activeDoctorId === tenantId) {
    const otraAsignacion = await prisma.doctorSecretaria.findFirst({ where: { secretariaId: id } });
    await prisma.user.update({
      where: { id },
      data: { activeDoctorId: otraAsignacion?.doctorId ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}
