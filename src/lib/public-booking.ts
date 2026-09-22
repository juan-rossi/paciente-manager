import { prisma } from "@/lib/prisma";
import { generarSlots } from "@/lib/slots";
import { startOfDayBA, formatDateParamBA } from "@/lib/timezone";

const HORIZONTE_DIAS_DEFAULT = 14;

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

// `reservaPublicaHabilitada` es independiente de `perfilPublico` (ver "Mi
// perfil") -- un médico puede compartir el link directo a su agenda sin
// aparecer en el directorio. Esta es la única función que debe decidir si
// un slug es válido para las rutas públicas de reserva, y no exige
// `perfilPublico` por la misma razón que `getDoctorPublicoPorSlug` no lo
// exige para la página del perfil.
export async function getDoctorParaReserva(slug: string) {
  return prisma.user.findFirst({
    where: { role: "DOCTOR", reservaPublicaHabilitada: true, publicSlug: slug },
  });
}

export type HorarioDisponible = {
  inicio: string;
  lugarId: string;
};

export type DisponibilidadDia = {
  fecha: string;
  horarios: HorarioDisponible[];
};

// Trae los turnos de todo el horizonte en una sola query (no una por día,
// mismo criterio que se aplicó para sacar el N+1 de turnos-del-dia.ts) y
// arma la disponibilidad de cada día en memoria a partir de la grilla real
// generada por `generarSlots`. No expone nada de los turnos existentes más
// que su horario -- ni nombre, ni teléfono, ni DNI.
export async function getDisponibilidadPublica(
  doctor: { id: string; slotDurationMinutes: number },
  horizonteDias: number = HORIZONTE_DIAS_DEFAULT
): Promise<DisponibilidadDia[]> {
  const blocks = await prisma.workScheduleBlock.findMany({ where: { userId: doctor.id } });

  const hoy = startOfDayBA(new Date());
  const desde = hoy;
  const hasta = addDays(hoy, horizonteDias);

  const turnos = await prisma.turno.findMany({
    where: { doctorId: doctor.id, estado: "CONFIRMADO", inicio: { gte: desde, lt: hasta } },
    select: { inicio: true },
  });
  const ocupados = new Set(turnos.map((t) => t.inicio.getTime()));

  const ahora = Date.now();
  const dias: DisponibilidadDia[] = [];
  for (let i = 0; i < horizonteDias; i++) {
    const dia = addDays(hoy, i);
    const slots = generarSlots(dia, blocks, doctor.slotDurationMinutes);
    const horarios: HorarioDisponible[] = slots
      .filter((slot) => slot.inicio.getTime() > ahora && !ocupados.has(slot.inicio.getTime()))
      .map((slot) => ({ inicio: slot.inicio.toISOString(), lugarId: slot.lugarId }));
    dias.push({ fecha: formatDateParamBA(dia), horarios });
  }
  return dias;
}

// Defensa contra horarios inventados: un `inicio` solo es válido para
// reservar si coincide exactamente con un slot generado a partir del
// horario de trabajo real del médico ese día. Devuelve el slot que matchea
// (con su `lugarId`) en vez de un booleano -- la ruta de reserva pública lo
// usa para completar el `lugarId` del turno del lado del server, nunca
// confiando en lo que mande el cliente.
export async function buscarSlotValido(
  doctor: { id: string; slotDurationMinutes: number },
  inicio: Date
): Promise<{ inicio: Date; fin: Date; lugarId: string } | null> {
  const blocks = await prisma.workScheduleBlock.findMany({ where: { userId: doctor.id } });
  const slots = generarSlots(startOfDayBA(inicio), blocks, doctor.slotDurationMinutes);
  return slots.find((slot) => slot.inicio.getTime() === inicio.getTime()) ?? null;
}
