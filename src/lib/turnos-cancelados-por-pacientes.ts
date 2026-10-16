import { prisma } from "@/lib/prisma";
import { startOfDayBA } from "@/lib/timezone";

export type TurnoCanceladoPorPaciente = {
  id: string;
  nombreYApellido: string;
  telefono: string;
  inicio: string;
  canceladoAt: string;
  lugarNombre: string | null;
};

// Turnos que el propio paciente canceló (perfil público o link del recordatorio).
// Ya no ocupan la agenda (estado CANCELADO); esto es solo el registro. Mismo
// criterio de scoping por lugar que el resto de la app (`lugarId === null` =
// secretaria sin lugar asignado, no ve nada). Acotado al día que se está
// mirando en la agenda (por la fecha del turno, no la de la cancelación).
export async function getTurnosCanceladosPorPacientes(
  date: Date,
  tenantId: string,
  lugarId?: string | null
): Promise<TurnoCanceladoPorPaciente[]> {
  if (lugarId === null) return [];

  const dayStart = startOfDayBA(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const turnos = await prisma.turno.findMany({
    where: {
      doctorId: tenantId,
      canceladoPorPacienteAt: { not: null },
      inicio: { gte: dayStart, lt: dayEnd },
      ...(lugarId ? { lugarId } : {}),
    },
    orderBy: { inicio: "asc" },
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
