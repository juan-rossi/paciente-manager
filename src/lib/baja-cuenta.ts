// Plazos del Acuerdo de tratamiento de datos, punto 6 (baja de la cuenta).
// Si cambian, cambia el acuerdo: subir `ACUERDO_DATOS_VERSION`.
export const BAJA_DIAS_PARA_DESCARGAR = 90;
// Las copias de respaldo del proveedor de la base rotan en este plazo: el
// acuerdo promete que los datos desaparecen de ellas en los días siguientes.
export const BAJA_DIAS_RESPALDOS = 35;

// Palabra que el médico escribe para confirmar la baja.
export const BAJA_CONFIRMACION = "BAJA";

export function eliminacionProgramadaPara(bajaAt: Date): Date {
  return new Date(bajaAt.getTime() + BAJA_DIAS_PARA_DESCARGAR * 24 * 60 * 60 * 1000);
}

export function diasParaEliminacion(bajaAt: Date, ahora = new Date()): number {
  const ms = eliminacionProgramadaPara(bajaAt).getTime() - ahora.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
