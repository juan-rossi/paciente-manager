import { prisma } from "@/lib/prisma";
import { generarSlots } from "@/lib/slots";
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
  esSobreturno: boolean;
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
  date: Date,
  tenantId: string
): Promise<{ turnos: TurnoDelDia[]; diasConHorario: DiaSemana[] }> {
  const inicioDia = startOfDayBA(date);
  const inicioSiguiente = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const blocks = await prisma.workScheduleBlock.findMany({ where: { userId: tenantId } });
  const diasConHorario = [...new Set(blocks.map((b) => b.diaSemana as DiaSemana))];

  const doctor = await prisma.user.findUnique({
    where: { id: tenantId },
    select: { slotDurationMinutes: true },
  });

  const turnos = await prisma.turno.findMany({
    where: {
      doctorId: tenantId,
      inicio: { gte: inicioDia, lt: inicioSiguiente },
      estado: "CONFIRMADO",
    },
    orderBy: { inicio: "asc" },
    select: {
      id: true,
      inicio: true,
      nombreYApellido: true,
      dni: true,
      telefono: true,
      obraSocial: true,
      createdAt: true,
    },
  });

  // Mismo criterio que `get-day-slots.ts`: un turno es "sobreturno" si su
  // `inicio` no corresponde a ningún slot generado por el horario de
  // trabajo, o si comparte ese `inicio` con otro turno creado antes (solo el
  // primero creado ocupa la fila normal de la grilla).
  const slots = doctor ? generarSlots(date, blocks, doctor.slotDurationMinutes) : [];
  const slotInicios = new Set(slots.map((slot) => slot.inicio.getTime()));
  const turnoDeGrillaPorInicio = new Map<number, string>();
  for (const turno of [...turnos].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
    const key = turno.inicio.getTime();
    if (!slotInicios.has(key)) continue;
    if (!turnoDeGrillaPorInicio.has(key)) turnoDeGrillaPorInicio.set(key, turno.id);
  }

  // Se trae toda la lista de pacientes del doctor de una sola vez y el match
  // se resuelve en memoria -- antes se hacían hasta 2 queries POR turno en
  // paralelo (`Promise.all`), lo que en un día con varios turnos disparaba
  // muchas conexiones concurrentes contra la base y podía hacer que Postgres
  // cierre la conexión ("Server has closed the connection").
  const patients = await prisma.patient.findMany({
    where: { doctorId: tenantId, deletedAt: null },
    select: { id: true, nroDocumento: true, nombreYApellido: true },
  });

  const patientPorDni = new Map<string, string>();
  const patientPorNombre = new Map<string, string>();
  for (const patient of patients) {
    if (patient.nroDocumento && !patientPorDni.has(patient.nroDocumento)) {
      patientPorDni.set(patient.nroDocumento, patient.id);
    }
    const nombreKey = patient.nombreYApellido.toLowerCase();
    if (!patientPorNombre.has(nombreKey)) {
      patientPorNombre.set(nombreKey, patient.id);
    }
  }

  const resueltos = turnos.map((turno) => {
    const dniMatchId = turno.dni ? (patientPorDni.get(turno.dni) ?? null) : null;
    const nombreMatchId = dniMatchId
      ? null
      : (patientPorNombre.get(turno.nombreYApellido.toLowerCase()) ?? null);

    const matchType: TurnoDelDia["matchType"] = dniMatchId ? "dni" : nombreMatchId ? "nombre" : null;

    return {
      id: turno.id,
      inicio: turno.inicio.toISOString(),
      nombreYApellido: turno.nombreYApellido,
      dni: turno.dni,
      telefono: turno.telefono,
      obraSocial: turno.obraSocial,
      patientId: dniMatchId ?? nombreMatchId,
      matchType,
      esSobreturno: turnoDeGrillaPorInicio.get(turno.inicio.getTime()) !== turno.id,
    };
  });

  return { turnos: resueltos, diasConHorario };
}
