import { z } from "zod";
import type { GrupoEspecialidad } from "@/lib/especialidad";
import { esFechaValida, MENSAJE_FECHA_INVALIDA, TEXTO_MEDIO } from "@/lib/limites-texto";

// Controles con fecha (ver PatientControl en prisma/schema.prisma). Cada
// columna numérica es un "campo"; un "indicador" es lo que se muestra junto
// (la presión son dos campos en un mismo gráfico).

export const CAMPOS_CONTROL = [
  "peso",
  "talla",
  "perimetroCefalico",
  "cintura",
  "porcentajeGrasa",
  "presionSistolica",
  "presionDiastolica",
  "frecuenciaCardiaca",
  "glucemia",
  "hba1c",
  "litemia",
  "alturaUterina",
  "frecuenciaCardiacaFetal",
  "pioOd",
  "pioOi",
  "eva",
  "ecog",
  "hemoglobina",
  "plaquetas",
  "leucocitos",
] as const;

export type CampoControl = (typeof CAMPOS_CONTROL)[number];

// Rango aceptado y decimales de cada campo. El rango es para frenar errores
// de tipeo (un peso de 7000), no un rango clínico normal.
export const CAMPO_CONTROL_INFO: Record<
  CampoControl,
  // `ejemplo`: placeholder del campo cuando el formato no es obvio (los
  // laboratorios informan las plaquetas como 250.000 o como 250 x10³).
  { label: string; corto: string; min: number; max: number; decimales: number; ejemplo?: string }
> = {
  peso: { label: "Peso", corto: "Peso", min: 0.3, max: 400, decimales: 1 },
  talla: { label: "Talla", corto: "Talla", min: 20, max: 250, decimales: 1 },
  perimetroCefalico: { label: "Perímetro cefálico", corto: "PC", min: 20, max: 70, decimales: 1 },
  cintura: { label: "Circunferencia de cintura", corto: "Cintura", min: 30, max: 250, decimales: 1 },
  porcentajeGrasa: { label: "Masa grasa", corto: "Grasa", min: 1, max: 80, decimales: 1 },
  presionSistolica: { label: "Presión máxima", corto: "Máx", min: 50, max: 300, decimales: 0 },
  presionDiastolica: { label: "Presión mínima", corto: "Mín", min: 20, max: 200, decimales: 0 },
  frecuenciaCardiaca: { label: "Frecuencia cardíaca", corto: "FC", min: 20, max: 250, decimales: 0 },
  glucemia: { label: "Glucemia", corto: "Glucemia", min: 10, max: 1000, decimales: 0 },
  hba1c: { label: "HbA1c", corto: "HbA1c", min: 3, max: 20, decimales: 1 },
  litemia: { label: "Litemia", corto: "Litemia", min: 0.01, max: 5, decimales: 2 },
  alturaUterina: { label: "Altura uterina", corto: "AU", min: 5, max: 50, decimales: 0 },
  frecuenciaCardiacaFetal: { label: "Latidos fetales", corto: "FCF", min: 60, max: 240, decimales: 0 },
  pioOd: { label: "Presión intraocular OD", corto: "OD", min: 1, max: 80, decimales: 0 },
  pioOi: { label: "Presión intraocular OI", corto: "OI", min: 1, max: 80, decimales: 0 },
  eva: { label: "Dolor (EVA)", corto: "EVA", min: 0, max: 10, decimales: 0 },
  ecog: { label: "ECOG", corto: "ECOG", min: 0, max: 4, decimales: 0 },
  hemoglobina: { label: "Hemoglobina", corto: "Hb", min: 1, max: 25, decimales: 1, ejemplo: "Ej. 13,5" },
  plaquetas: { label: "Plaquetas", corto: "Plaq.", min: 1000, max: 2_000_000, decimales: 0, ejemplo: "Ej. 250.000" },
  leucocitos: { label: "Leucocitos", corto: "GB", min: 100, max: 500_000, decimales: 0, ejemplo: "Ej. 7.000" },
};

export type Indicador = {
  id: string;
  label: string;
  // Para encabezados angostos (la tabla de controles de la ficha).
  corto: string;
  unidad: string;
  // Con dos campos: "barra" los escribe como la presión arterial ("120/80");
  // si no, cada uno con su nombre ("OD 16 · OI 18"), porque en la PIO "9/10"
  // se confunde con una agudeza visual.
  formato?: "barra";
  // Escala con puntaje fijo (EVA 0-10, ECOG 0-4): no tiene unidad, se lee
  // "5 de 10" y el gráfico va siempre de punta a punta de la escala (si se
  // ajustara a los datos, pasar de 4 a 5 parecería un salto enorme).
  escala?: { min: number; max: number };
  campos: readonly CampoControl[];
};

const INDICADORES = {
  peso: { id: "peso",
    corto: "Peso", label: "Peso", unidad: "kg", campos: ["peso"] },
  talla: { id: "talla",
    corto: "Talla", label: "Talla", unidad: "cm", campos: ["talla"] },
  perimetroCefalico: {
    id: "perimetroCefalico",
    corto: "PC",
    label: "Perímetro cefálico",
    unidad: "cm",
    campos: ["perimetroCefalico"],
  },
  cintura: { id: "cintura",
    corto: "Cintura", label: "Cintura", unidad: "cm", campos: ["cintura"] },
  porcentajeGrasa: { id: "porcentajeGrasa",
    corto: "Grasa", label: "Masa grasa", unidad: "%", campos: ["porcentajeGrasa"] },
  presion: {
    id: "presion",
    corto: "PA",
    label: "Presión arterial",
    unidad: "mmHg",
    campos: ["presionSistolica", "presionDiastolica"],
    formato: "barra",
  },
  frecuenciaCardiaca: {
    id: "frecuenciaCardiaca",
    corto: "FC",
    label: "Frecuencia cardíaca",
    unidad: "lpm",
    campos: ["frecuenciaCardiaca"],
  },
  glucemia: { id: "glucemia",
    corto: "Gluc.", label: "Glucemia", unidad: "mg/dl", campos: ["glucemia"] },
  hba1c: { id: "hba1c",
    corto: "HbA1c", label: "HbA1c", unidad: "%", campos: ["hba1c"] },
  litemia: { id: "litemia",
    corto: "Litemia", label: "Litemia", unidad: "mEq/l", campos: ["litemia"] },
  alturaUterina: { id: "alturaUterina",
    corto: "AU", label: "Altura uterina", unidad: "cm", campos: ["alturaUterina"] },
  frecuenciaCardiacaFetal: {
    id: "frecuenciaCardiacaFetal",
    corto: "FCF",
    label: "Latidos fetales",
    unidad: "lpm",
    campos: ["frecuenciaCardiacaFetal"],
  },
  pio: {
    id: "pio",
    corto: "PIO",
    label: "Presión intraocular",
    unidad: "mmHg",
    campos: ["pioOd", "pioOi"],
  },
  eva: { id: "eva", corto: "EVA", label: "Dolor (EVA)", unidad: "", escala: { min: 0, max: 10 }, campos: ["eva"] },
  ecog: { id: "ecog", corto: "ECOG", label: "ECOG", unidad: "", escala: { min: 0, max: 4 }, campos: ["ecog"] },
  hemoglobina: { id: "hemoglobina", corto: "Hb", label: "Hemoglobina", unidad: "g/dl", campos: ["hemoglobina"] },
  plaquetas: { id: "plaquetas", corto: "Plaq.", label: "Plaquetas", unidad: "/mm³", campos: ["plaquetas"] },
  leucocitos: { id: "leucocitos", corto: "GB", label: "Leucocitos", unidad: "/mm³", campos: ["leucocitos"] },
} as const satisfies Record<string, Indicador>;

// Qué sigue cada grupo en el tiempo. Los grupos sin indicadores no muestran
// controles (psicología, fonoaudiología, odontología).
export function indicadoresPara(grupo: GrupoEspecialidad): readonly Indicador[] {
  const i = INDICADORES;
  switch (grupo) {
    case "MEDICA":
      return [i.peso, i.presion, i.frecuenciaCardiaca, i.glucemia, i.hba1c];
    case "PEDIATRICA":
      return [i.peso, i.talla, i.perimetroCefalico];
    case "GINECOLOGICA":
      return [i.peso, i.presion, i.alturaUterina, i.frecuenciaCardiacaFetal];
    case "PSIQUIATRICA":
      return [i.peso, i.presion, i.cintura, i.litemia];
    case "NUTRICION":
      return [i.peso, i.cintura, i.porcentajeGrasa];
    case "OFTALMOLOGICA":
      return [i.pio];
    case "LOCOMOTOR":
      return [i.eva, i.peso];
    case "ONCOLOGICA":
      return [i.peso, i.ecog, i.hemoglobina, i.plaquetas, i.leucocitos];
    default:
      return [];
  }
}

export function camposPara(grupo: GrupoEspecialidad): CampoControl[] {
  return indicadoresPara(grupo).flatMap((i) => i.campos);
}

// "72,5" con los decimales del campo, en formato argentino.
export function formatValor(campo: CampoControl, valor: number): string {
  const decimales = CAMPO_CONTROL_INFO[campo].decimales;
  return valor.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: decimales });
}

type ValoresControl = Partial<Record<CampoControl, number | null>>;

// Cómo se nombra lo que acompaña al valor: la unidad ("kg") o, en una
// escala, su rango. `donde` elige la forma: "rango" ("0 a 10", para el
// formulario y la copia), "corto" ("0–10", encabezado de la tabla) o "valor"
// ("de 10", al lado del número).
export function unidadIndicador(indicador: Indicador, donde: "rango" | "corto" | "valor"): string {
  const e = indicador.escala;
  if (!e) return indicador.unidad;
  if (donde === "valor") return `de ${e.max}`;
  return donde === "corto" ? `${e.min}–${e.max}` : `${e.min} a ${e.max}`;
}

// El valor de un indicador en un control, listo para mostrar: "72,5",
// "120/80" o "OD 16 · OI 18". Null si el control no lo tiene.
export function formatIndicador(indicador: Indicador, c: ValoresControl): string | null {
  const valores = indicador.campos.map((campo) => (c[campo] == null ? null : formatValor(campo, c[campo]!)));
  if (valores.every((v) => v == null)) return null;
  if (indicador.campos.length === 1) return valores[0];
  if (indicador.formato === "barra") return valores.map((v) => v ?? "–").join("/");
  return indicador.campos
    .map((campo, k) => (valores[k] == null ? null : `${CAMPO_CONTROL_INFO[campo].corto} ${valores[k]}`))
    .filter(Boolean)
    .join(" · ");
}

// Cuánto cambió cada campo del indicador desde el control anterior: "+1",
// o con dos campos "OD +1 · OI +3" (los que no cambiaron no se nombran).
// Null si no hay nada que comparar o nada cambió.
export function formatCambio(indicador: Indicador, ultimo: ValoresControl, anterior: ValoresControl): string | null {
  const partes = indicador.campos.flatMap((campo) => {
    const a = ultimo[campo];
    const b = anterior[campo];
    if (a == null || b == null || a === b) return [];
    const delta = `${a > b ? "+" : "−"}${formatValor(campo, Math.abs(a - b))}`;
    return [indicador.campos.length > 1 ? `${CAMPO_CONTROL_INFO[campo].corto} ${delta}` : delta];
  });
  return partes.length > 0 ? partes.join(" · ") : null;
}

// Lo que tipea el médico ("72,5") -> número, o null si está vacío. NaN si no
// es un número.
// Con `campo`, en los que no llevan decimales (plaquetas, leucocitos) el punto
// y la coma son separadores de miles: "145.000" es 145000.
export function parseValor(texto: string, campo?: CampoControl): number | null {
  const sinMiles =
    campo && CAMPO_CONTROL_INFO[campo].decimales === 0 ? texto.replace(/[.,](?=\d{3}(\D|$))/g, "") : texto;
  const limpio = sinMiles.trim().replace(",", ".");
  if (limpio === "") return null;
  return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : Number.NaN;
}

const valoresSchema = Object.fromEntries(
  CAMPOS_CONTROL.map((campo) => {
    const { label, min, max } = CAMPO_CONTROL_INFO[campo];
    return [
      campo,
      z
        .number()
        .min(min, `${label}: el valor mínimo es ${min}.`)
        .max(max, `${label}: el valor máximo es ${max}.`)
        .nullable(),
    ];
  })
) as Record<CampoControl, z.ZodNullable<z.ZodNumber>>;

// Alta y edición de un control. Viajan todos los campos (null = vacío): la
// edición reemplaza el control entero.
export const controlInput = z
  .object({
    fecha: z.string().trim().min(1, "La fecha es obligatoria.").refine(esFechaValida, MENSAJE_FECHA_INVALIDA),
    ...valoresSchema,
    nota: z
      .string()
      .trim()
      .max(TEXTO_MEDIO, `Máximo ${TEXTO_MEDIO} caracteres.`)
      .transform((v) => (v.length === 0 ? null : v))
      .nullable(),
  })
  .refine((data) => CAMPOS_CONTROL.some((campo) => data[campo] != null), {
    message: "Cargá al menos un valor.",
    path: ["fecha"],
  });

export type ControlInput = z.infer<typeof controlInput>;

// `creado` (ISO) desempata dos controles del mismo día: el último cargado es
// el más reciente.
export type ControlValue = { id: string; fecha: string; nota: string | null; creado: string } & Record<
  CampoControl,
  number | null
>;

// Un PatientControl (de Prisma o de la API) -> valor para la UI.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function controlFromDb(c: any): ControlValue {
  const fecha = typeof c.fecha === "string" ? c.fecha : new Date(c.fecha).toISOString();
  return {
    id: c.id,
    fecha: fecha.slice(0, 10),
    nota: c.nota ?? null,
    creado: c.createdAt ? new Date(c.createdAt).toISOString() : "",
    ...(Object.fromEntries(CAMPOS_CONTROL.map((campo) => [campo, c[campo] ?? null])) as Record<
      CampoControl,
      number | null
    >),
  };
}

// Orden cronológico: por fecha y, el mismo día, por orden de carga.
export function compararControles(a: ControlValue, b: ControlValue): number {
  return a.fecha.localeCompare(b.fecha) || a.creado.localeCompare(b.creado);
}

// Los valores del control listos para Prisma.
export function datosControl(data: ControlInput) {
  return {
    fecha: new Date(data.fecha),
    nota: data.nota,
    ...(Object.fromEntries(CAMPOS_CONTROL.map((campo) => [campo, data[campo]])) as Record<
      CampoControl,
      number | null
    >),
  };
}
