import { TABLAS_OMS, type LMS } from "@/lib/percentiles-oms-datos";

// Percentiles de los Patrones de Crecimiento Infantil de la OMS (0 a 5 años):
// peso, longitud/talla y perímetro cefálico para la edad, por sexo. Método
// LMS: z = ((X/M)^L − 1) / (L·S). Ver percentiles-oms-datos.ts.

export type IndicadorOms = "peso" | "talla" | "perimetroCefalico";
export type SexoOms = "MASCULINO" | "FEMENINO";

const DIAS_POR_MES = 30.4375;
const MESES_MAX = 60;

function diasEntre(desde: string, hasta: string): number {
  const ms = (f: string) => {
    const [y, m, d] = f.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(hasta) - ms(desde)) / 86_400_000);
}

// L, M y S para una edad en días, interpolando entre meses. Null fuera de
// 0 a 5 años (los patrones de la OMS no cubren más).
export function lmsPara(indicador: IndicadorOms, sexo: SexoOms, edadDias: number): LMS | null {
  const meses = edadDias / DIAS_POR_MES;
  if (!(meses >= 0) || meses > MESES_MAX) return null;
  const tabla = TABLAS_OMS[indicador][sexo];
  const i = Math.min(Math.floor(meses), MESES_MAX - 1);
  const t = meses - i;
  const [a, b] = [tabla[i], tabla[i + 1]];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function valorEnZ([l, m, s]: LMS, z: number): number {
  return l === 0 ? m * Math.exp(s * z) : m * Math.pow(1 + l * s * z, 1 / l);
}

// Puntaje z. Cuando L no es 1 (peso), la OMS corrige más allá de ±3 DE con la
// distancia entre las curvas de 2 y 3 DE, para no exagerar los extremos.
export function puntajeZ(valor: number, lms: LMS): number {
  const [l, m, s] = lms;
  const z = l === 0 ? Math.log(valor / m) / s : (Math.pow(valor / m, l) - 1) / (l * s);
  if (l === 1 || Math.abs(z) <= 3) return z;
  if (z > 3) {
    const sd3 = valorEnZ(lms, 3);
    return 3 + (valor - sd3) / (sd3 - valorEnZ(lms, 2));
  }
  const sd3 = valorEnZ(lms, -3);
  return -3 + (valor - sd3) / (valorEnZ(lms, -2) - sd3);
}

// Función de distribución normal (aproximación de Abramowitz y Stegun 26.2.17,
// error < 7,5·10⁻⁸).
function normalAcumulada(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - p : p;
}

// Percentil (0-100) de una medición, o null si falta algo o está fuera de 0-5
// años.
export function percentilOms(
  indicador: IndicadorOms,
  sexo: string | null | undefined,
  fechaNacimiento: string | null | undefined,
  fechaMedicion: string,
  valor: number | null | undefined
): number | null {
  if (valor == null || !(valor > 0) || !fechaNacimiento) return null;
  if (sexo !== "MASCULINO" && sexo !== "FEMENINO") return null;
  const lms = lmsPara(indicador, sexo, diasEntre(fechaNacimiento, fechaMedicion));
  if (!lms) return null;
  return normalAcumulada(puntajeZ(valor, lms)) * 100;
}

// Puntaje z de una medición (null si falta algo o está fuera de 0-5 años).
export function puntajeZOms(
  indicador: IndicadorOms,
  sexo: string | null | undefined,
  fechaNacimiento: string | null | undefined,
  fechaMedicion: string,
  valor: number | null | undefined
): number | null {
  if (valor == null || !(valor > 0) || !fechaNacimiento) return null;
  if (sexo !== "MASCULINO" && sexo !== "FEMENINO") return null;
  const lms = lmsPara(indicador, sexo, diasEntre(fechaNacimiento, fechaMedicion));
  return lms ? puntajeZ(valor, lms) : null;
}

// Más allá de 5 desvíos del esperado para la edad, casi seguro es un error
// de carga (ej. 21 en vez de 102 cm). Se avisa, no se bloquea: un caso real
// extremo puede existir.
export const Z_INVEROSIMIL = 5;

// "P50"; los extremos como "<P1" y ">P99" (ahí el número exacto ya no aporta).
export function formatPercentil(p: number): string {
  if (p < 1) return "<P1";
  if (p > 99) return ">P99";
  return `P${Math.round(p)}`;
}

// Curvas de referencia que se dibujan detrás de la línea del paciente.
export const PERCENTILES_REFERENCIA = [
  { etiqueta: "P3", z: -1.880794 },
  { etiqueta: "P50", z: 0 },
  { etiqueta: "P97", z: 1.880794 },
] as const;

// Valor de un percentil de referencia en una fecha dada (null fuera de 0-5
// años).
export function valorReferencia(
  indicador: IndicadorOms,
  sexo: SexoOms,
  fechaNacimiento: string,
  fecha: string,
  z: number
): number | null {
  const lms = lmsPara(indicador, sexo, diasEntre(fechaNacimiento, fecha));
  return lms ? valorEnZ(lms, z) : null;
}
