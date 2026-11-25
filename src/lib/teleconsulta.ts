import { prisma } from "@/lib/prisma";
import { asegurarSala, crearTokenSala } from "@/lib/daily";

// Ventana en la que se puede entrar a la sala de una teleconsulta: desde un
// rato antes del turno (para probar cámara/micrófono) hasta un rato después
// del fin (los turnos se atrasan). Fuera de eso la sala ni se crea.
export const SALA_ABRE_MINUTOS_ANTES = 15;
export const SALA_CIERRA_MINUTOS_DESPUES = 60;

const MINUTO = 60_000;

export function ventanaSala(turno: { inicio: Date; fin: Date }) {
  return {
    desde: new Date(turno.inicio.getTime() - SALA_ABRE_MINUTOS_ANTES * MINUTO),
    hasta: new Date(turno.fin.getTime() + SALA_CIERRA_MINUTOS_DESPUES * MINUTO),
  };
}

export type EstadoSala = "antes" | "abierta" | "cerrada";

export function estadoSala(turno: { inicio: Date; fin: Date }, ahora = new Date()): EstadoSala {
  const { desde, hasta } = ventanaSala(turno);
  if (ahora < desde) return "antes";
  if (ahora > hasta) return "cerrada";
  return "abierta";
}

/**
 * Devuelve la URL (sala + token) para que una persona entre a la
 * teleconsulta de un turno. Quien llama ya validó que el turno es VIRTUAL,
 * no está cancelado y que la persona tiene derecho a entrar.
 */
export async function urlIngresoSala(
  turno: { id: string; inicio: Date; fin: Date; salaVideoNombre: string | null },
  persona: { nombreVisible: string; esMedico: boolean },
): Promise<string> {
  const { desde, hasta } = ventanaSala(turno);
  // El id del turno es un cuid (no adivinable) y la sala es privada: sin
  // token no se puede entrar aunque se conozca el nombre.
  const nombre = turno.salaVideoNombre ?? `semio-${turno.id}`;
  const sala = await asegurarSala(nombre, desde, hasta);
  if (!turno.salaVideoNombre) {
    await prisma.turno.update({ where: { id: turno.id }, data: { salaVideoNombre: sala.name } });
  }
  const token = await crearTokenSala({
    sala: sala.name,
    nombreVisible: persona.nombreVisible,
    esMedico: persona.esMedico,
    hasta,
  });
  return `${sala.url}?t=${encodeURIComponent(token)}`;
}

