import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { secretaryInputSchema } from "@/lib/turno-schema";
import { listarSecretariasDelMedico, obtenerSecretariaDelMedico } from "@/lib/secretarias";
import { enviarInvitacion } from "@/lib/invitacion-secretaria";
import { getSiteUrl } from "@/lib/site-url";

export async function GET() {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  return NextResponse.json({ secretarias: await listarSecretariasDelMedico(tenantId) });
}

// El médico nunca elige la contraseña de la secretaria: solo la invita por
// email. Si no tiene cuenta se le crea una sin contraseña, y desde el link
// del mail elige la suya o entra con Google (ver `/invitacion`). En ambos
// casos la asignación no da acceso a nada hasta que ella la acepte (ver
// `DoctorSecretaria.aceptadaAt`).
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

  // Los lugares elegidos tienen que ser lugares activos de ESTE médico --
  // nunca de otro (nada impide que el cliente mande cualquier id).
  const lugaresValidos = await prisma.lugarDeTrabajo.count({
    where: { id: { in: parsed.data.lugarIds }, userId: tenantId, deletedAt: null },
  });
  if (lugaresValidos !== parsed.data.lugarIds.length) {
    return NextResponse.json({ error: "Uno de los lugares seleccionados no es válido." }, { status: 400 });
  }

  const asignacion = {
    doctorId: tenantId,
    puedeBloquearHorarios: parsed.data.puedeBloquearHorarios,
    lugares: { create: parsed.data.lugarIds.map((lugarId) => ({ lugarId })) },
  };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  let secretariaId: string;
  let doctorSecretariaId: string;

  if (existing) {
    if (existing.role !== "SECRETARY") {
      return NextResponse.json(
        { error: "Ese email ya está en uso por otra cuenta." },
        { status: 409 }
      );
    }

    // Ya existe como secretaria (posiblemente de otro médico): puede asistir
    // a más de un médico, pero la cuenta es de ella -- no se tocan su
    // nombre ni su contraseña.
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

    const creada = await prisma.doctorSecretaria.create({
      data: { ...asignacion, secretariaId: existing.id },
      select: { id: true },
    });
    secretariaId = existing.id;
    doctorSecretariaId = creada.id;
  } else {
    if (!parsed.data.nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio para invitar a una secretaria nueva." },
        { status: 400 }
      );
    }

    // `passwordHash` vacío = todavía no eligió contraseña (mismo valor que
    // las cuentas creadas con Google): no se puede ingresar con contraseña
    // hasta que la elija desde el link de la invitación.
    const creada = await prisma.user.create({
      data: {
        email: parsed.data.email,
        nombre: parsed.data.nombre,
        passwordHash: "",
        role: "SECRETARY",
        secretariaAsignaciones: { create: asignacion },
      },
      select: { id: true, secretariaAsignaciones: { select: { id: true } } },
    });
    secretariaId = creada.id;
    doctorSecretariaId = creada.secretariaAsignaciones[0].id;
  }

  const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;
  after(() =>
    enviarInvitacion(doctorSecretariaId, baseUrl).catch((error) =>
      console.error("[invitacion-secretaria] no se pudo enviar el mail", error)
    )
  );

  return NextResponse.json(
    { secretaria: await obtenerSecretariaDelMedico(tenantId, secretariaId) },
    { status: 201 }
  );
}
