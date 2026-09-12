import { prisma } from "@/lib/prisma";
import { startOfDayBA } from "@/lib/timezone";
import type { DiaSemana } from "@/lib/slots";

export type TurnoDelDia = {
  id: string;
  inicio: string;
  nombreYApellido: string;
  dni: string | null;
  telefono: string;
  obraSocial: string | null;
  patientId: string | null;
  matchType: "dni" | "nombre" | null;
};

/**
 * Turnos confirmados de un día puntual, con el mismo intento de "match" con
 * un paciente ya cargado que usa el dashboard: por DNI primero, por nombre
 * si no hay DNI o no matcheó. `Turno.patientId` (la columna real) no se usa
 * acá a propósito -- solo queda seteada cuando el turno se reservó sabiendo
 * qué paciente era, y este listado quiere sugerir un match aunque el turno
 * se haya cargado sin esa relación.
 */
export async function getTurnosDelDia(
  date: Date
): Promise<{ turnos: TurnoDelDia[]; diasConHorario: DiaSemana[] }> {
  const inicioDia = startOfDayBA(date);
  const inicioSiguiente = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const doctor = await prisma.user.findFirst({ where: { role: "DOCTOR" } });
  const blocks = doctor
    ? await prisma.workScheduleBlock.findMany({ where: { userId: doctor.id } })
    : [];
  const diasConHorario = [...new Set(blocks.map((b) => b.diaSemana as DiaSemana))];

  const turnos = await prisma.turno.findMany({
    where: { inicio: { gte: inicioDia, lt: inicioSiguiente }, estado: "CONFIRMADO" },
    orderBy: { inicio: "asc" },
    select: {
      id: true,
      inicio: true,
      nombreYApellido: true,
      dni: true,
      telefono: true,
      obraSocial: true,
    },
  });

  const resueltos = await Promise.all(
    turnos.map(async (turno) => {
      const dniMatch = turno.dni
        ? await prisma.patient.findFirst({
            where: { nroDocumento: turno.dni },
            select: { id: true },
          })
        : null;
      const nombreMatch = dniMatch
        ? null
        : await prisma.patient.findFirst({
            where: { nombreYApellido: { equals: turno.nombreYApellido, mode: "insensitive" } },
            select: { id: true },
          });

      const patient = dniMatch ?? nombreMatch;
      const matchType: TurnoDelDia["matchType"] = dniMatch ? "dni" : nombreMatch ? "nombre" : null;

      return {
        id: turno.id,
        inicio: turno.inicio.toISOString(),
        nombreYApellido: turno.nombreYApellido,
        dni: turno.dni,
        telefono: turno.telefono,
        obraSocial: turno.obraSocial,
        patientId: patient?.id ?? null,
        matchType,
      };
    })
  );

  return { turnos: resueltos, diasConHorario };
}
