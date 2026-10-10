import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { hashPassword } from "@/lib/auth";
import { secretaryInputSchema } from "@/lib/turno-schema";
import { listarSecretariasDelMedico } from "@/lib/secretarias";
import { enviarMailInvitacionSecretaria } from "@/lib/invitacion-secretaria-email";
import { formatNombreConTitulo } from "@/lib/titulo-cortesia";
import { getSiteUrl } from "@/lib/site-url";

export async function GET() {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  return NextResponse.json({ secretarias: await listarSecretariasDelMedico(tenantId) });
}

export async function POST(request: NextRequest) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = secretaryInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Los lugares elegidos tienen que ser lugares activos de ESTE médico --
  // nunca de otro (nada impide que el cliente mande cualquier id).
  const lugaresValidos = await prisma.lugarDeTrabajo.count({
    where: { id: { in: parsed.data.lugarIds }, userId: tenantId, deletedAt: null },
  });
  if (lugaresValidos !== parsed.data.lugarIds.length) {
    return NextResponse.json({ error: "Uno de los lugares seleccionados no es válido." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (existing) {
    if (existing.role !== "SECRETARY") {
      return NextResponse.json(
        { error: "Ese email ya está en uso por otra cuenta." },
        { status: 409 }
      );
    }

    // Ya existe como secretaria (posiblemente de otro médico): puede asistir
    // a más de un médico, pero la cuenta es de ella -- se le manda una
    // invitación y la asignación no da acceso a nada hasta que la acepte
    // (ver `DoctorSecretaria.aceptadaAt`). No se tocan su nombre/contraseña.
    const yaAsignada = await prisma.doctorSecretaria.findUnique({
      where: { doctorId_secretariaId: { doctorId: tenantId, secretariaId: existing.id } },
    });
    if (yaAsignada) {
      return NextResponse.json(
        {
          error: yaAsignada.aceptadaAt
            ? "Esa secretaria ya está asignada a tu cuenta."
            : "Ya le enviaste una invitación a esa secretaria.",
        },
        { status: 409 }
      );
    }

    await prisma.doctorSecretaria.create({
      data: {
        doctorId: tenantId,
        secretariaId: existing.id,
        puedeBloquearHorarios: parsed.data.puedeBloquearHorarios,
        lugares: { create: parsed.data.lugarIds.map((lugarId) => ({ lugarId })) },
      },
    });

    const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;
    const nombreMedico = formatNombreConTitulo(user.tituloCortesia, `${user.nombre} ${user.apellido}`.trim());
    after(() =>
      enviarMailInvitacionSecretaria(
        { email: existing.email, nombreSecretaria: existing.nombre, nombreMedico },
        baseUrl
      )
    );

    return NextResponse.json(
      {
        secretaria: {
          id: existing.id,
          email: existing.email,
          nombre: existing.nombre,
          createdAt: existing.createdAt,
          lugarIds: parsed.data.lugarIds,
          puedeBloquearHorarios: parsed.data.puedeBloquearHorarios,
          pendiente: true,
          datosEditables: false,
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

  // La cuenta la crea el propio médico, así que la asignación nace aceptada.
  const secretaria = await prisma.user.create({
    data: {
      email: parsed.data.email,
      nombre: parsed.data.nombre,
      passwordHash,
      role: "SECRETARY",
      activeDoctorId: tenantId,
      secretariaAsignaciones: {
        create: {
          doctorId: tenantId,
          aceptadaAt: new Date(),
          puedeBloquearHorarios: parsed.data.puedeBloquearHorarios,
          lugares: { create: parsed.data.lugarIds.map((lugarId) => ({ lugarId })) },
        },
      },
    },
    select: { id: true, email: true, nombre: true, createdAt: true },
  });

  return NextResponse.json(
    {
      secretaria: {
        ...secretaria,
        lugarIds: parsed.data.lugarIds,
        puedeBloquearHorarios: parsed.data.puedeBloquearHorarios,
        pendiente: false,
        datosEditables: true,
      },
      linked: false,
    },
    { status: 201 }
  );
}
