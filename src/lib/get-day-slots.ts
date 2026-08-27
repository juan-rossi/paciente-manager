import { prisma } from "@/lib/prisma";
import { generarSlots } from "@/lib/slots";
import { serializeTurno } from "@/lib/turno-serialize";
import type { UserRole } from "@/lib/auth";

export type SerializedTurno = {
  id: string;
  estado: string;
  nombreYApellido: string;
  fechaNacimiento: string | null;
  dni: string;
  telefono: string | null;
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
): Promise<{ slots: DaySlot[]; sinConfigurar: boolean }> {
  const doctor = await prisma.user.findFirst({ where: { role: "DOCTOR" } });
  if (!doctor) {
    return { slots: [], sinConfigurar: true };
  }

  const blocks = await prisma.workScheduleBlock.findMany({ where: { userId: doctor.id } });
  const slots = generarSlots(date, blocks, doctor.slotDurationMinutes);

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
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

  return { slots: result, sinConfigurar: blocks.length === 0 };
}
