import { prisma } from "@/lib/prisma";

export type SecretariaDelMedico = {
  id: string;
  email: string;
  nombre: string;
  createdAt: Date;
  lugarIds: string[];
  puedeBloquearHorarios: boolean;
  // Invitación todavía no aceptada (ver `DoctorSecretaria.aceptadaAt`).
  pendiente: boolean;
  // Email y nombre son de la cuenta del asistente, no de la relación: el
  // médico solo puede cambiarlos si ella asiste únicamente a él. Si tiene
  // CUALQUIER relación con otro médico -- aceptada o una invitación todavía
  // pendiente --, cambiarle el email y pedir "recuperar contraseña" sería
  // tomar el control de una cuenta con acceso (o a punto de tenerlo) a la
  // agenda de ese otro médico. La contraseña nunca la toca el médico (ver
  // POST /api/users).
  datosEditables: boolean;
};

type AsignacionRow = {
  doctorId: string;
  createdAt: Date;
  aceptadaAt: Date | null;
  puedeBloquearHorarios: boolean;
  lugares: { lugarId: string }[];
};

const asignacionSelect = {
  doctorId: true,
  createdAt: true,
  aceptadaAt: true,
  puedeBloquearHorarios: true,
  lugares: { select: { lugarId: true } },
} as const;

function aSecretariaDelMedico(
  doctorId: string,
  s: { id: string; email: string; nombre: string; secretariaAsignaciones: AsignacionRow[] }
): SecretariaDelMedico {
  const propia = s.secretariaAsignaciones.find((a) => a.doctorId === doctorId);
  // Aceptadas o pendientes: una invitación pendiente es una fila atada al id
  // de la cuenta, así que quien controle la cuenta puede aceptarla.
  const otrosMedicos = s.secretariaAsignaciones.some((a) => a.doctorId !== doctorId);
  return {
    id: s.id,
    email: s.email,
    // Invitación todavía no aceptada: nunca se muestra el nombre, tampoco
    // cuando la cuenta se acaba de crear con el nombre que tipeó el médico.
    // Si solo se ocultara el de cuentas preexistentes, la respuesta de
    // "invitar" diría qué emails ya son asistentes en Semio360 (y el
    // nombre con el que se registraron).
    nombre: propia?.aceptadaAt ? s.nombre : "",
    // Fecha de la asignación con ESTE médico, no de la cuenta: la de la
    // cuenta delataba lo mismo (una cuenta vieja = ya existía).
    createdAt: propia?.createdAt ?? new Date(0),
    lugarIds: propia?.lugares.map((l) => l.lugarId) ?? [],
    puedeBloquearHorarios: propia?.puedeBloquearHorarios ?? false,
    pendiente: !propia?.aceptadaAt,
    datosEditables: Boolean(propia?.aceptadaAt) && !otrosMedicos,
  };
}

// Asistentes asignados al médico (aceptados o con invitación pendiente).
export async function listarSecretariasDelMedico(doctorId: string): Promise<SecretariaDelMedico[]> {
  const secretarias = await prisma.user.findMany({
    where: { role: "SECRETARY", secretariaAsignaciones: { some: { doctorId } } },
    select: {
      id: true,
      email: true,
      nombre: true,
      secretariaAsignaciones: { select: asignacionSelect },
    },
  });
  // Las más recientes primero, por la fecha de la asignación con este médico.
  return secretarias
    .map((s) => aSecretariaDelMedico(doctorId, s))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function obtenerSecretariaDelMedico(
  doctorId: string,
  secretariaId: string
): Promise<SecretariaDelMedico | null> {
  const s = await prisma.user.findFirst({
    where: { id: secretariaId, role: "SECRETARY", secretariaAsignaciones: { some: { doctorId } } },
    select: {
      id: true,
      email: true,
      nombre: true,
      secretariaAsignaciones: { select: asignacionSelect },
    },
  });
  return s ? aSecretariaDelMedico(doctorId, s) : null;
}
