// Cambio de modalidad de un turno ya dado (presencial <-> teleconsulta), ver
// `Turno.teleconsulta`. Sin dependencias de servidor: lo usan la API y los
// tests.

type MotivoAviso = "CANCELADO" | "APLAZADO" | "PASADO_A_TELECONSULTA" | "PASADO_A_PRESENCIAL";

/**
 * Qué hacer con "Pendientes de notificar" al cambiar la modalidad: el
 * paciente tiene que enterarse, así que el turno queda pendiente de aviso.
 *
 * - Si ya estaba pendiente el cambio contrario (se pasó a teleconsulta y se
 *   volvió a presencial sin avisarle a nadie), el paciente sigue sabiendo lo
 *   que sabía: se saca de pendientes.
 * - Si estaba pendiente un APLAZADO (lo movió "Bloquear horarios"), se pisa:
 *   el mensaje de cambio de modalidad ya dice la fecha y hora actuales del
 *   turno, que son las nuevas.
 */
export function avisoPorCambioDeModalidad(
  actual: { avisoPendiente: boolean; avisoPendienteMotivo: MotivoAviso | null },
  teleconsulta: boolean
) {
  const contrario: MotivoAviso = teleconsulta ? "PASADO_A_PRESENCIAL" : "PASADO_A_TELECONSULTA";
  if (actual.avisoPendiente && actual.avisoPendienteMotivo === contrario) {
    return { avisoPendiente: false, avisoPendienteMotivo: null, avisoPendienteFechaAnterior: null };
  }
  return {
    avisoPendiente: true,
    avisoPendienteMotivo: (teleconsulta ? "PASADO_A_TELECONSULTA" : "PASADO_A_PRESENCIAL") as MotivoAviso,
    avisoPendienteFechaAnterior: null,
  };
}
