import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { formatNombreConTitulo, type TituloCortesia } from "@/lib/titulo-cortesia";
import { sendEmail } from "@/lib/email";
import { mailInvitacionSecretaria } from "@/lib/invitacion-secretaria-email";
import { INVITACION_VALIDEZ_DIAS } from "@/lib/invitacion-secretaria-shared";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Genera un token nuevo para la invitación (invalida el anterior, si había)
// y manda el mail. Tira si falla el envío: en el alta se llama dentro de
// `after()` y solo se loguea (la invitación queda pendiente y se puede
// reenviar); al reenviar, el médico ve el error.
export async function enviarInvitacion(doctorSecretariaId: string, baseUrl: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const asignacion = await prisma.doctorSecretaria.update({
    where: { id: doctorSecretariaId },
    data: {
      invitacionTokenHash: hashToken(token),
      invitacionExpiraAt: new Date(Date.now() + INVITACION_VALIDEZ_DIAS * 24 * 60 * 60_000),
    },
    select: {
      doctor: { select: { nombre: true, apellido: true, tituloCortesia: true } },
      secretaria: { select: { email: true, nombre: true, passwordHash: true } },
    },
  });

  await sendEmail({
    to: asignacion.secretaria.email,
    ...mailInvitacionSecretaria(
      {
        nombreSecretaria: asignacion.secretaria.nombre,
        nombreMedico: nombreDelMedico(asignacion.doctor),
        cuentaNueva: asignacion.secretaria.passwordHash === "",
      },
      `${baseUrl}/invitacion?token=${encodeURIComponent(token)}`
    ),
  });
}

function nombreDelMedico(doctor: { nombre: string; apellido: string; tituloCortesia: TituloCortesia | null }) {
  return formatNombreConTitulo(doctor.tituloCortesia, `${doctor.nombre} ${doctor.apellido}`.trim());
}

export type InvitacionVigente = {
  id: string;
  doctorId: string;
  nombreMedico: string;
  secretariaId: string;
  email: string;
  nombre: string;
  // Sin contraseña = nunca eligió una (cuenta recién invitada, o que solo
  // entra con Google): en `/invitacion` se le ofrece elegirla.
  tienePassword: boolean;
};

export async function buscarInvitacion(token: string): Promise<InvitacionVigente | null> {
  const asignacion = await prisma.doctorSecretaria.findUnique({
    where: { invitacionTokenHash: hashToken(token) },
    select: {
      id: true,
      doctorId: true,
      aceptadaAt: true,
      invitacionExpiraAt: true,
      doctor: { select: { nombre: true, apellido: true, tituloCortesia: true } },
      secretaria: { select: { id: true, email: true, nombre: true, passwordHash: true } },
    },
  });
  if (!asignacion || asignacion.aceptadaAt) return null;
  if (!asignacion.invitacionExpiraAt || asignacion.invitacionExpiraAt < new Date()) return null;

  return {
    id: asignacion.id,
    doctorId: asignacion.doctorId,
    nombreMedico: nombreDelMedico(asignacion.doctor),
    secretariaId: asignacion.secretaria.id,
    email: asignacion.secretaria.email,
    nombre: asignacion.secretaria.nombre,
    tienePassword: asignacion.secretaria.passwordHash !== "",
  };
}

// Marca la invitación como aceptada y consume el token. Si la secretaria no
// estaba atendiendo a ningún médico, pasa directo a este. El `updateMany`
// condicionado a `aceptadaAt: null` evita aceptar dos veces la misma.
export async function aceptarInvitacion(invitacion: { id: string; doctorId: string; secretariaId: string }) {
  await prisma.$transaction([
    prisma.doctorSecretaria.updateMany({
      where: { id: invitacion.id, aceptadaAt: null },
      data: { aceptadaAt: new Date(), invitacionTokenHash: null, invitacionExpiraAt: null },
    }),
    prisma.user.updateMany({
      where: { id: invitacion.secretariaId, activeDoctorId: null },
      data: { activeDoctorId: invitacion.doctorId },
    }),
  ]);
}

export type ResultadoActivar = "ok" | "invalido" | "ya-tiene-password";

// Desde el link del mail, una secretaria sin contraseña elige la suya (y
// confirma su nombre): eso acepta la invitación. El token prueba que es
// dueña del email. Si ya tiene contraseña no se pisa -- tiene que ingresar
// con la que ya usa (o recuperarla), nunca reemplazarla desde un link que
// le pudo haber llegado reenviado.
export async function activarConPassword(token: string, nombre: string, password: string): Promise<ResultadoActivar> {
  const invitacion = await buscarInvitacion(token);
  if (!invitacion) return "invalido";
  if (invitacion.tienePassword) return "ya-tiene-password";

  const passwordHash = await hashPassword(password);
  const { count } = await prisma.user.updateMany({
    where: { id: invitacion.secretariaId, passwordHash: "" },
    data: { passwordHash, nombre },
  });
  if (count === 0) return "ya-tiene-password";

  await aceptarInvitacion(invitacion);
  return "ok";
}
