import { prisma } from "@/lib/prisma";

export type TurnoCanceladoPorPaciente = {
  id: string;
  nombreYApellido: string;
  telefono: string;
  inicio: string;
  canceladoAt: string;
  lugarNombre: string | null;
};

const LIMITE = 100;

// Turnos reservados online que el propio paciente canceló desde el perfil.
// Ya no ocupan la agenda (estado CANCELADO); esto es solo el registro. Mismo
// criterio de scoping por lugar que el resto de la app (`lugarId === null` =
// secretaria sin lugar asignado, no ve nada).
export async function getTurnosCanceladosPorPacientes(
  tenantId: string,
  lugarId?: string | null
): Promise<TurnoCanceladoPorPaciente[]> {
  if (lugarId === null) return [];

  const turnos = await prisma.turno.findMany({
    where: {
      doctorId: tenantId,
      canceladoPorPacienteAt: { not: null },
      ...(lugarId ? { lugarId } : {}),
    },
    orderBy: { canceladoPorPacienteAt: "desc" },
    take: LIMITE,
    select: {
      id: true,
      nombreYApellido: true,
      telefono: true,
      inicio: true,
      canceladoPorPacienteAt: true,
      lugar: { select: { nombre: true } },
    },
  });

  return turnos.map((t) => ({
    id: t.id,
    nombreYApellido: t.nombreYApellido,
    telefono: t.telefono,
    inicio: t.inicio.toISOString(),
    canceladoAt: t.canceladoPorPacienteAt!.toISOString(),
    lugarNombre: t.lugar.nombre,
  }));
}
