// Configuración > Teleconsulta, por médico (ver `User.teleconsulta*`).
// Sin dependencias de servidor: lo usan la API, las páginas y los tests. El
// flag de plataforma (TELECONSULTA_HABILITADA, ver `feature-flags.ts`) se
// pasa como argumento.

export type TeleconsultaConfigGuardada = {
  teleconsultaHabilitada: boolean;
  teleconsultaPasarPresenciales: boolean;
  teleconsultaLugarVirtual: boolean;
};

// Lo que el médico (y su asistente) puede hacer de verdad: la configuración
// guardada vale solo si la plataforma tiene la teleconsulta prendida.
export type TeleconsultaEfectiva = {
  habilitada: boolean;
  pasarPresenciales: boolean;
  lugarVirtual: boolean;
};

export const TELECONSULTA_APAGADA: TeleconsultaEfectiva = {
  habilitada: false,
  pasarPresenciales: false,
  lugarVirtual: false,
};

export function teleconsultaEfectiva(
  plataformaHabilitada: boolean,
  config: TeleconsultaConfigGuardada
): TeleconsultaEfectiva {
  const habilitada = plataformaHabilitada && config.teleconsultaHabilitada;
  return {
    habilitada,
    pasarPresenciales: habilitada && config.teleconsultaPasarPresenciales,
    lugarVirtual: habilitada && config.teleconsultaLugarVirtual,
  };
}

/**
 * Valida un cambio de configuración. Devuelve el mensaje de error o null.
 *
 * - Prendida, tiene que quedar al menos una opción (si no, no hace nada).
 * - No se puede dejar de permitir el lugar de Teleconsulta mientras exista
 *   uno: tiene agenda y reserva online propias, y quedaría huérfano. Primero
 *   se elimina desde Mi práctica.
 * - Dejar de permitir pasar turnos a teleconsulta NO se bloquea: los que ya
 *   se pasaron siguen siendo videollamada y se pueden volver a presencial.
 */
export function validarConfigTeleconsulta(
  nueva: TeleconsultaConfigGuardada,
  tieneLugarVirtual: boolean
): string | null {
  if (
    nueva.teleconsultaHabilitada &&
    !nueva.teleconsultaPasarPresenciales &&
    !nueva.teleconsultaLugarVirtual
  ) {
    return "Elegí al menos una forma de atender por teleconsulta.";
  }
  const permiteLugar = nueva.teleconsultaHabilitada && nueva.teleconsultaLugarVirtual;
  if (tieneLugarVirtual && !permiteLugar) {
    return "Tenés un lugar de Teleconsulta en Mi práctica. Eliminalo primero para desactivar esta opción.";
  }
  return null;
}
