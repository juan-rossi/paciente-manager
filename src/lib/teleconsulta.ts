import { prisma } from "@/lib/prisma";
import { asegurarSala, crearTokenSala } from "@/lib/daily";

// Ventana en la que se puede entrar a la sala de una teleconsulta: desde un
// rato antes del turno (para probar cámara/micrófono) hasta un rato después
// del fin (los turnos se atrasan). Fuera de eso la sala ni se crea.
export const SALA_ABRE_MINUTOS_ANTES = 15;
export const SALA_CIERRA_MINUTOS_DESPUES = 60;
// Duración máxima de la videollamada. El reloj arranca la primera vez que
// entra el médico, pero nunca antes de la hora del turno (si entra antes a
// probar la cámara, cuenta desde `inicio`). Salir y volver a entrar no lo
// reinicia: al llegar a `salaVideoCierraAt` Daily saca a todos.
export const DURACION_LLAMADA_MINUTOS = 45;

const MINUTO = 60_000;

type TurnoSala = { inicio: Date; fin: Date; salaVideoCierraAt?: Date | null };

export function ventanaSala(turno: TurnoSala) {
  return {
    desde: new Date(turno.inicio.getTime() - SALA_ABRE_MINUTOS_ANTES * MINUTO),
    hasta:
      turno.salaVideoCierraAt ?? new Date(turno.fin.getTime() + SALA_CIERRA_MINUTOS_DESPUES * MINUTO),
  };
}

export function cierreLlamada(turno: { inicio: Date }, ingresoMedico: Date): Date {
  const arranque = Math.max(turno.inicio.getTime(), ingresoMedico.getTime());
  return new Date(arranque + DURACION_LLAMADA_MINUTOS * MINUTO);
}

export type EstadoSala = "antes" | "abierta" | "cerrada";

export function estadoSala(turno: TurnoSala, ahora = new Date()): EstadoSala {
  const { desde, hasta } = ventanaSala(turno);
  if (ahora < desde) return "antes";
  if (ahora > hasta) return "cerrada";
  return "abierta";
}

/**
 * Devuelve la URL (sala + token) para que una persona entre a la
 * teleconsulta de un turno. Quien llama ya validó que el turno es teleconsulta,
 * no está cancelado y que la persona tiene derecho a entrar.
 */
export async function urlIngresoSala(
  turno: {
    id: string;
    inicio: Date;
    fin: Date;
    salaVideoNombre: string | null;
    salaVideoCierraAt: Date | null;
  },
  persona: { nombreVisible: string; esMedico: boolean },
): Promise<string> {
  let cierraAt = turno.salaVideoCierraAt;
  if (persona.esMedico && !cierraAt) {
    // Primer ingreso del médico: arranca el reloj de la llamada. El
    // `updateMany` condicionado evita pisar el cierre si entró dos veces a la vez.
    const candidato = cierreLlamada(turno, new Date());
    await prisma.turno.updateMany({
      where: { id: turno.id, salaVideoCierraAt: null },
      data: { salaVideoCierraAt: candidato },
    });
    const guardado = await prisma.turno.findUnique({
      where: { id: turno.id },
      select: { salaVideoCierraAt: true },
    });
    cierraAt = guardado?.salaVideoCierraAt ?? candidato;
  }

  const { desde, hasta } = ventanaSala({ ...turno, salaVideoCierraAt: cierraAt });
  // El id del turno es un cuid (no adivinable) y la sala es privada: sin
  // token no se puede entrar aunque se conozca el nombre.
  const nombre = turno.salaVideoNombre ?? `semio-${turno.id}`;
  // Si el paciente entró antes que el médico, la sala ya existe con el cierre
  // largo: `asegurarSala` la acorta, y Daily saca también al paciente.
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
