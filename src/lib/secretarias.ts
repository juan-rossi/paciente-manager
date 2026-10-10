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
  // Email, nombre y contraseña son de la cuenta de la secretaria, no de la
  // relación: el médico solo puede cambiarlos si ella asiste únicamente a
  // él. Si también asiste a otro médico, cambiarlos sería tomar el control
  // de una cuenta con acceso a la agenda de ese otro médico.
  datosEditables: boolean;
};

type AsignacionRow = {
  doctorId: string;
  aceptadaAt: Date | null;
  puedeBloquearHorarios: boolean;
  lugares: { lugarId: string }[];
};

const asignacionSelect = {
  doctorId: true,
  aceptadaAt: true,
  puedeBloquearHorarios: true,
  lugares: { select: { lugarId: true } },
} as const;

function aSecretariaDelMedico(
  doctorId: string,
  s: { id: string; email: string; nombre: string; createdAt: Date; secretariaAsignaciones: AsignacionRow[] }
): SecretariaDelMedico {
  const propia = s.secretariaAsignaciones.find((a) => a.doctorId === doctorId);
  const otrosMedicos = s.secretariaAsignaciones.some((a) => a.doctorId !== doctorId && a.aceptadaAt);
  return {
    id: s.id,
    email: s.email,
    nombre: s.nombre,
    createdAt: s.createdAt,
    lugarIds: propia?.lugares.map((l) => l.lugarId) ?? [],
    puedeBloquearHorarios: propia?.puedeBloquearHorarios ?? false,
    pendiente: !propia?.aceptadaAt,
    datosEditables: Boolean(propia?.aceptadaAt) && !otrosMedicos,
  };
}

// Secretarias asignadas al médico (aceptadas o con invitación pendiente).
export async function listarSecretariasDelMedico(doctorId: string): Promise<SecretariaDelMedico[]> {
  const secretarias = await prisma.user.findMany({
    where: { role: "SECRETARY", secretariaAsignaciones: { some: { doctorId } } },
    select: {
      id: true,
      email: true,
      nombre: true,
      createdAt: true,
      secretariaAsignaciones: { select: asignacionSelect },
    },
    orderBy: { createdAt: "desc" },
  });
  return secretarias.map((s) => aSecretariaDelMedico(doctorId, s));
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
      createdAt: true,
      secretariaAsignaciones: { select: asignacionSelect },
    },
  });
  return s ? aSecretariaDelMedico(doctorId, s) : null;
}
