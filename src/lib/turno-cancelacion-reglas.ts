// Reglas puras (sin dependencias de servidor) para poder usarlas también en
// el cliente.

// Antelación mínima para que el paciente cancele online. Pasado este límite
// el turno sigue activo y tiene que contactar al médico.
export const CANCELACION_ANTELACION_MINUTOS = 60;

export function puedeCancelarOnline(inicio: Date, ahora: Date = new Date()): boolean {
  return inicio.getTime() - ahora.getTime() >= CANCELACION_ANTELACION_MINUTOS * 60_000;
}
