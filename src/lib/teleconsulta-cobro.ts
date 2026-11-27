// Cobro de la teleconsulta (Configuración > Teleconsulta, ver
// `User.teleconsultaCobro` / `User.aliasCobro`). Sin dependencias de
// servidor: lo usan la API, Configuración, Recordatorios y los tests.

export type MomentoCobro = "ANTES" | "DESPUES";

// Lo que se guarda en Configuración > Teleconsulta > Cobro.
export type CobroTeleconsulta = {
  teleconsultaCobro: MomentoCobro;
  aliasCobro: string | null;
  montoTeleconsulta: number | null;
  montoTeleconsultaUsaParticular: boolean;
};

// Lo que necesita el recordatorio: el monto ya resuelto (ver `montoDeTeleconsulta`).
export type CobroRecordatorio = {
  teleconsultaCobro: MomentoCobro;
  aliasCobro: string | null;
  monto?: number | null;
};

// Tope del monto (igual que el de la consulta particular en Coberturas: 9 dígitos).
export const MONTO_TELECONSULTA_MAX = 999_999_999;

/**
 * El monto que se le cobra al paciente por una teleconsulta: el de la consulta
 * particular (Coberturas) o uno propio, según lo que eligió el médico. null si
 * el que corresponde no está cargado.
 */
export function montoDeTeleconsulta(
  cobro: Pick<CobroTeleconsulta, "montoTeleconsulta" | "montoTeleconsultaUsaParticular">,
  montoConsultaParticular: number | null
): number | null {
  return cobro.montoTeleconsultaUsaParticular ? montoConsultaParticular : cobro.montoTeleconsulta;
}

export function formatMonto(monto: number): string {
  return `$${monto.toLocaleString("es-AR")}`;
}

/**
 * Qué es lo que cargó el médico como destino de la transferencia. Ya viene
 * normalizado (ver `normalizarAliasCobro`): un CBU/CVU son 22 dígitos, y el
 * CVU (billeteras virtuales) es el que empieza con 000.
 */
export function tipoAliasCobro(aliasCobro: string): "alias" | "CBU" | "CVU" {
  if (!/^\d{22}$/.test(aliasCobro)) return "alias";
  return aliasCobro.startsWith("000") ? "CVU" : "CBU";
}

/**
 * Normaliza lo que el médico escribió como alias/CBU/CVU. Devuelve el valor
 * a guardar (null si lo dejó vacío) o un error.
 *
 * - CBU/CVU: 22 dígitos (se aceptan espacios o guiones entre medio).
 * - Alias: 6 a 20 caracteres, letras, números, puntos y guiones (las reglas
 *   del BCRA para alias).
 */
export function normalizarAliasCobro(
  valor: string | null | undefined
): { ok: true; valor: string | null } | { ok: false; error: string } {
  const texto = (valor ?? "").trim();
  if (!texto) return { ok: true, valor: null };

  const digitos = texto.replace(/[\s-]/g, "");
  if (/^\d+$/.test(digitos)) {
    return digitos.length === 22
      ? { ok: true, valor: digitos }
      : { ok: false, error: "El CBU/CVU tiene que tener 22 números." };
  }
  if (/^[a-zA-Z0-9.-]{6,20}$/.test(texto)) return { ok: true, valor: texto };
  return {
    ok: false,
    error: "El alias tiene que tener entre 6 y 20 caracteres: letras, números, puntos o guiones.",
  };
}

/**
 * Texto de `{pago}` en el recordatorio de una teleconsulta: cuándo se paga y,
 * si están cargados, cuánto y a qué alias/CBU transferir.
 */
export function textoPago(cobro: CobroRecordatorio): string {
  // Ej.: ` por transferencia al alias "dr.perez"` / ` … al CBU "0170…"`.
  const destino = cobro.aliasCobro
    ? ` por transferencia al ${tipoAliasCobro(cobro.aliasCobro)} "${cobro.aliasCobro}"`
    : "";
  const monto = cobro.monto != null ? ` (${formatMonto(cobro.monto)})` : "";
  return cobro.teleconsultaCobro === "ANTES"
    ? `Recordá abonar la consulta${monto}${destino} antes del turno.`
    : `La consulta${monto} se abona al terminar la videollamada${destino}.`;
}
