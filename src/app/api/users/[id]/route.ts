import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { secretaryUpdateSchema } from "@/lib/turno-schema";
import { obtenerSecretariaDelMedico } from "@/lib/secretarias";
import { avisarEmailDeAccesoCambiado } from "@/lib/email-acceso-cambiado";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  const existing = await obtenerSecretariaDelMedico(tenantId, id);
  if (!existing) {
    return NextResponse.json({ error: "Asistente no encontrado." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = secretaryUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Email y nombre son de la cuenta de la secretaria: si tiene cualquier
  // relación con otro médico (aceptada o invitación pendiente), o todavía no
  // aceptó la de este, no son de este médico para cambiarlos -- ver
  // `SecretariaDelMedico.datosEditables`. La contraseña nunca la toca el
  // médico.
  const cambiaEmail = parsed.data.email !== existing.email;
  const cambiaDatosDeCuenta = cambiaEmail || parsed.data.nombre !== existing.nombre;
  if (cambiaDatosDeCuenta && !existing.datosEditables) {
    return NextResponse.json(
      {
        error: existing.pendiente
          ? "Todavía no aceptó la invitación: no podés cambiar su email ni su nombre."
          : "También asiste a otro médico (o tiene una invitación de otro médico): su email y su nombre no se pueden cambiar desde acá.",
      },
      { status: 403 }
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

  if (cambiaDatosDeCuenta) {
    await prisma.user.update({
      where: { id },
      data: {
        email: parsed.data.email,
        nombre: parsed.data.nombre,
        // Cambiar el email de acceso cierra todas sus sesiones (ver
        // `sessionVersion` en el callback `jwt` de src/auth.ts): vuelve a
        // entrar con el email nuevo.
        ...(cambiaEmail ? { sessionVersion: { increment: 1 } } : {}),
      },
    });
    if (cambiaEmail) {
      const emailAnterior = existing.email;
      const nombreMedico = `${user.nombre} ${user.apellido}`.trim();
      after(() =>
        avisarEmailDeAccesoCambiado({
          emailAnterior,
          emailNuevo: parsed.data.email,
          nombreSecretaria: parsed.data.nombre,
          nombreMedico,
        })
      );
    }
  }

  const { id: doctorSecretariaId } = await prisma.doctorSecretaria.update({
    where: { doctorId_secretariaId: { doctorId: tenantId, secretariaId: id } },
    data: { puedeBloquearHorarios: parsed.data.puedeBloquearHorarios },
    select: { id: true },
  });
  await prisma.doctorSecretariaLugar.deleteMany({ where: { doctorSecretariaId } });
  await prisma.doctorSecretariaLugar.createMany({
    data: parsed.data.lugarIds.map((lugarId) => ({ doctorSecretariaId, lugarId })),
  });

  return NextResponse.json({ secretaria: await obtenerSecretariaDelMedico(tenantId, id) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;

  // Esta secretaria puede asistir a más de un médico -- acá solo se quita la
  // asignación a la cuenta de este médico (o se cancela la invitación si
  // todavía no la aceptó), nunca se borra la cuenta.
  const { count } = await prisma.doctorSecretaria.deleteMany({
    where: { doctorId: tenantId, secretariaId: id },
  });
  if (count === 0) {
    return NextResponse.json({ error: "Asistente no encontrado." }, { status: 404 });
  }

  // Si tenía a este médico como el activo, hay que reasignarla a otro de los
  // que le queden (o dejarla sin médico activo si no le queda ninguno).
  const secretaria = await prisma.user.findUnique({ where: { id } });
  if (secretaria?.activeDoctorId === tenantId) {
    const otraAsignacion = await prisma.doctorSecretaria.findFirst({
      where: { secretariaId: id, aceptadaAt: { not: null } },
    });
    await prisma.user.update({
      where: { id },
      data: { activeDoctorId: otraAsignacion?.doctorId ?? null },
    });
  }

  return NextResponse.json({ ok: true });
}
