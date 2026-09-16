import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { secretaryInputSchema } from "@/lib/turno-schema";

export async function GET() {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const secretarias = await prisma.user.findMany({
    where: { role: "SECRETARY", secretariaAsignaciones: { some: { doctorId: tenantId } } },
    select: { id: true, email: true, nombre: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ secretarias });
}

export async function POST(request: NextRequest) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = secretaryInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (existing) {
    if (existing.role !== "SECRETARY") {
      return NextResponse.json(
        { error: "Ese email ya está en uso por otra cuenta." },
        { status: 409 }
      );
    }

    // Ya existe como secretaria (posiblemente de otro médico): la sumamos a
    // esta cuenta en vez de crear un usuario nuevo -- puede asistir a más de
    // un médico. No se tocan su nombre/contraseña, son de su propia cuenta.
    const yaAsignada = await prisma.doctorSecretaria.findUnique({
      where: { doctorId_secretariaId: { doctorId: tenantId, secretariaId: existing.id } },
    });
    if (yaAsignada) {
      return NextResponse.json(
        { error: "Esa secretaria ya está asignada a tu cuenta." },
        { status: 409 }
      );
    }

    await prisma.doctorSecretaria.create({ data: { doctorId: tenantId, secretariaId: existing.id } });
    if (!existing.activeDoctorId) {
      await prisma.user.update({ where: { id: existing.id }, data: { activeDoctorId: tenantId } });
    }

    return NextResponse.json(
      {
        secretaria: {
          id: existing.id,
          email: existing.email,
          nombre: existing.nombre,
          createdAt: existing.createdAt,
        },
        linked: true,
      },
      { status: 201 }
    );
  }

  if (!parsed.data.nombre || !parsed.data.password) {
    return NextResponse.json(
      { error: "Nombre y contraseña son obligatorios para una secretaria nueva." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const secretaria = await prisma.user.create({
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      passwordHash,
      role: "SECRETARY",
      activeDoctorId: tenantId,
      secretariaAsignaciones: { create: { doctorId: tenantId } },
    },
    select: { id: true, email: true, nombre: true, createdAt: true },
  });

  return NextResponse.json({ secretaria, linked: false }, { status: 201 });
}
