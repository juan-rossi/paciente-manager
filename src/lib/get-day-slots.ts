import { prisma } from "@/lib/prisma";
import { generarSlots } from "@/lib/slots";
import { serializeTurno } from "@/lib/turno-serialize";
import { startOfDayBA } from "@/lib/timezone";
import type { UserRole } from "@/lib/auth";
import type { DiaSemana } from "@/lib/slots";

export type SerializedTurno = {
  id: string;
  estado: string;
  origen: string;
  nombreYApellido: string;
  fechaNacimiento: string | null;
  dni: string | null;
  telefono: string;
  obraSocial: string | null;
  obraSocialNro: string | null;
  patientId?: string | null;
};

export type DaySlot = {
  inicio: string;
  fin: string;
  lugarId: string;
  turno: SerializedTurno | null;
};

export type LugarInfo = {
  id: string;
  nombre: string | null;
  tipo: string;
  ciudad: string | null;
};

export async function getDaySlots(
  date: Date,
  role: UserRole,
  tenantId: string,
  // Solo aplica a una SECRETARY (ver `resolveActiveLugarId`): `undefined` no
  // restringe nada (un DOCTOR siempre pasa esto así); un `lugarId` acota la
  // grilla a ese lugar; `null` significa que la secretaria no tiene ningún
  // lugar asignado -- no ve nada, en vez de ver todo el médico sin filtrar.
  lugarId?: string | null
): Promise<{
  slots: DaySlot[];
  sobreturnos: DaySlot[];
  sinConfigurar: boolean;
  diasConHorario: DiaSemana[];
  sobreturnosHabilitados: boolean;
  lugares: LugarInfo[];
}> {
  const doctor = await prisma.user.findUnique({ where: { id: tenantId } });
  if (!doctor || lugarId === null) {
    return {
      slots: [],
      sobreturnos: [],
      sinConfigurar: true,
      diasConHorario: [],
      sobreturnosHabilitados: doctor?.sobreturnosHabilitados ?? false,
      lugares: [],
    };
  }

  const lugares = await prisma.lugarDeTrabajo.findMany({
    where: { userId: doctor.id, deletedAt: null, ...(lugarId ? { id: lugarId } : {}) },
    select: { id: true, nombre: true, tipo: true, ciudad: true },
    orderBy: { createdAt: "asc" },
  });

  const blocks = await prisma.workScheduleBlock.findMany({
    where: { userId: doctor.id, ...(lugarId ? { lugarId } : {}) },
  });
  const diasConHorario = [...new Set(blocks.map((b) => b.diaSemana as DiaSemana))];
  const slots = generarSlots(date, blocks, doctor.slotDurationMinutes);

  const dayStart = startOfDayBA(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const turnos = await prisma.turno.findMany({
    where: {
      doctorId: tenantId,
      inicio: { gte: dayStart, lt: dayEnd },
      estado: "CONFIRMADO",
      ...(lugarId ? { lugarId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  function serialize(turno: (typeof turnos)[number]) {
    return serializeTurno(
      { ...turno, fechaNacimiento: turno.fechaNacimiento?.toISOString() ?? null },
      role
    ) as SerializedTurno;
  }

  // Un sobreturno puede caer justo en el mismo instante que un turno ya
  // reservado (se permite a propósito, ver `esSobreturno` en
  // `turno-schema.ts`) -- por eso puede haber más de un turno con el mismo
  // `inicio`. El primero creado (orden `createdAt`) es el que ocupa la fila
  // de la grilla; cualquier otro que comparta ese instante pasa a
  // `sobreturnos`, igual que uno con horario fuera de la grilla. Un turno
  // solo puede ocupar la grilla si su `inicio` corresponde a un slot real
  // (un sobreturno "al final de la lista" cae después del último slot y no
  // corresponde a ninguno -- por eso nunca debe marcarse a sí mismo como
  // ocupante de grilla, o desaparecería de ambas listas).
  const slotInicios = new Set(slots.map((slot) => slot.inicio.getTime()));
  const turnoDeGrillaPorInicio = new Map<number, (typeof turnos)[number]>();
  for (const turno of turnos) {
    const key = turno.inicio.getTime();
    if (!slotInicios.has(key)) continue;
    if (!turnoDeGrillaPorInicio.has(key)) turnoDeGrillaPorInicio.set(key, turno);
  }

  const result: DaySlot[] = slots.map((slot) => {
    const turno = turnoDeGrillaPorInicio.get(slot.inicio.getTime());
    return {
      inicio: slot.inicio.toISOString(),
      fin: slot.fin.toISOString(),
      lugarId: slot.lugarId,
      turno: turno ? serialize(turno) : null,
    };
  });

  const sobreturnos: DaySlot[] = turnos
    .filter((turno) => turnoDeGrillaPorInicio.get(turno.inicio.getTime())?.id !== turno.id)
    .map((turno) => ({
      inicio: turno.inicio.toISOString(),
      fin: turno.fin.toISOString(),
      lugarId: turno.lugarId,
      turno: serialize(turno),
    }));

  return {
    slots: result,
    sobreturnos,
    sinConfigurar: blocks.length === 0,
    diasConHorario,
    sobreturnosHabilitados: doctor.sobreturnosHabilitados,
    lugares,
  };
}
