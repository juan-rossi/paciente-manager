import { prisma } from "@/lib/prisma";
import { generarSlots } from "@/lib/slots";
import { serializeTurno } from "@/lib/turno-serialize";
import { startOfDayBA } from "@/lib/timezone";
import type { UserRole } from "@/lib/auth";
import type { DiaSemana } from "@/lib/slots";

export type SerializedTurno = {
  id: string;
  estado: string;
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
  turno: SerializedTurno | null;
};

export async function getDaySlots(
  date: Date,
  role: UserRole
): Promise<{ slots: DaySlot[]; sinConfigurar: boolean; diasConHorario: DiaSemana[] }> {
  const doctor = await prisma.user.findFirst({ where: { role: "DOCTOR" } });
  if (!doctor) {
    return { slots: [], sinConfigurar: true, diasConHorario: [] };
  }

  const blocks = await prisma.workScheduleBlock.findMany({ where: { userId: doctor.id } });
  const diasConHorario = [...new Set(blocks.map((b) => b.diaSemana as DiaSemana))];
  const slots = generarSlots(date, blocks, doctor.slotDurationMinutes);

  const dayStart = startOfDayBA(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const turnos = await prisma.turno.findMany({
    where: { inicio: { gte: dayStart, lt: dayEnd }, estado: "CONFIRMADO" },
  });
  const turnosPorInicio = new Map(turnos.map((t) => [t.inicio.getTime(), t]));

  const result: DaySlot[] = slots.map((slot) => {
    const turno = turnosPorInicio.get(slot.inicio.getTime());
    return {
      inicio: slot.inicio.toISOString(),
      fin: slot.fin.toISOString(),
      turno: turno
        ? (serializeTurno(
            { ...turno, fechaNacimiento: turno.fechaNacimiento?.toISOString() ?? null },
            role
          ) as SerializedTurno)
        : null,
    };
  });

  return { slots: result, sinConfigurar: blocks.length === 0, diasConHorario };
}
