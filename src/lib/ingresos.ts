// Reporte de ingresos del médico (página /ingresos). Lógica pura -- sin
// Prisma -- para poder usarla desde el cliente y testearla; las consultas
// viven en `ingresos-server.ts`.
//
// Criterio: un turno suma ingresos solo si está activo (`estado`
// CONFIRMADO) y marcado ASISTIO; sus montos son los que se congelaron al
// marcarlo (`Turno.montoCobertura` / `Turno.montoPlus`). Es lo facturado
// según los aranceles que cargó el médico, no lo efectivamente cobrado (las
// obras sociales pagan a 30-90 días y con débitos).

export const PARTICULAR = "Particular";

export type TurnoAsistencia = "ASISTIO" | "AUSENTE";

export type ArancelCobertura = { consulta: number | null; plus: number | null };

// Aranceles vigentes del médico: la consulta particular (`User`) y, por
// nombre de cobertura (`Prepaga.nombre`, que es lo que se guarda en
// `Turno.obraSocial`), lo que paga cada una más el plus.
export type Aranceles = {
  particular: number | null;
  porCobertura: Record<string, ArancelCobertura>;
};

function claveCobertura(nombre: string) {
  return nombre.trim().toLocaleLowerCase("es");
}

/** Nombre con el que se agrupa un turno en el reporte. */
export function nombreCobertura(obraSocial: string | null | undefined): string {
  const nombre = obraSocial?.trim();
  return nombre ? nombre : PARTICULAR;
}

/**
 * Montos a congelar en un turno al marcarlo ASISTIO, según los aranceles
 * vigentes. Una cobertura que el médico ya no tiene cargada (texto libre de
 * un turno viejo) devuelve null: queda "sin arancel" y se puede corregir a mano.
 */
export function montosVigentes(
  obraSocial: string | null | undefined,
  aranceles: Aranceles
): { montoCobertura: number | null; montoPlus: number | null } {
  const nombre = obraSocial?.trim();
  if (!nombre) return { montoCobertura: aranceles.particular, montoPlus: null };
  const buscada = claveCobertura(nombre);
  const encontrada = Object.entries(aranceles.porCobertura).find(([n]) => claveCobertura(n) === buscada)?.[1];
  return { montoCobertura: encontrada?.consulta ?? null, montoPlus: encontrada?.plus ?? null };
}

// --- Meses (siempre en hora de Argentina) ---------------------------------

const BA_UTC_OFFSET_HOURS = 3;
const MES_REGEX = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function esMes(value: string | null | undefined): value is string {
  return !!value && MES_REGEX.test(value);
}

function partesMes(mes: string) {
  const [, y, m] = MES_REGEX.exec(mes)!;
  return { year: Number(y), month: Number(m) };
}

function formatMes(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** "YYYY-MM" del mes de `fecha` en Buenos Aires. */
export function mesDeFechaBA(fecha: Date): string {
  const corrida = new Date(fecha.getTime() - BA_UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return formatMes(corrida.getUTCFullYear(), corrida.getUTCMonth() + 1);
}

/** Suma (o resta) meses a un "YYYY-MM". */
export function sumarMeses(mes: string, cantidad: number): string {
  const { year, month } = partesMes(mes);
  const indice = year * 12 + (month - 1) + cantidad;
  return formatMes(Math.floor(indice / 12), (indice % 12) + 1);
}

/** Instantes [desde, hasta) que cubren el mes completo en Buenos Aires. */
export function rangoMesBA(mes: string): { desde: Date; hasta: Date } {
  const { year, month } = partesMes(mes);
  return {
    desde: new Date(Date.UTC(year, month - 1, 1, BA_UTC_OFFSET_HOURS)),
    hasta: new Date(Date.UTC(year, month, 1, BA_UTC_OFFSET_HOURS)),
  };
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "noviembre 2026" */
export function labelMes(mes: string): string {
  const { year, month } = partesMes(mes);
  return `${MESES[month - 1]} ${year}`;
}

/** "nov" */
export function labelMesCorto(mes: string): string {
  return MESES[partesMes(mes).month - 1].slice(0, 3);
}

export function formatPesos(monto: number): string {
  return `$ ${monto.toLocaleString("es-AR")}`;
}

// --- Resumen ---------------------------------------------------------------

export type TurnoIngreso = {
  inicio: Date;
  obraSocial: string | null;
  asistencia: TurnoAsistencia | null;
  montoCobertura: number | null;
  montoPlus: number | null;
};

export type FilaCobertura = {
  cobertura: string;
  consultas: number;
  // Lo que paga la cobertura (o el paciente, si es Particular).
  monto: number;
  plus: number;
  total: number;
  // Consultas atendidas sin monto cargado (cobertura sin arancel).
  sinMonto: number;
};

export type ResumenIngresos = {
  total: number;
  particular: number;
  coberturas: number;
  plus: number;
  atendidos: number;
  ausentes: number;
  // Turnos ya pasados que todavía nadie marcó.
  sinMarcar: number;
  // Turnos que todavía no llegaron (no se pueden marcar).
  proximos: number;
  // Atendidos sin ningún monto -- el total queda corto.
  atendidosSinMonto: number;
  porCobertura: FilaCobertura[];
};

/**
 * Resume los turnos ACTIVOS (no cancelados) de un período. `ahora` separa
 * los pasados (marcables) de los próximos.
 */
export function resumirIngresos(turnos: TurnoIngreso[], ahora: Date): ResumenIngresos {
  const filas = new Map<string, FilaCobertura>();
  const resumen: ResumenIngresos = {
    total: 0,
    particular: 0,
    coberturas: 0,
    plus: 0,
    atendidos: 0,
    ausentes: 0,
    sinMarcar: 0,
    proximos: 0,
    atendidosSinMonto: 0,
    porCobertura: [],
  };

  for (const turno of turnos) {
    if (turno.asistencia === "AUSENTE") {
      resumen.ausentes++;
      continue;
    }
    if (turno.asistencia !== "ASISTIO") {
      if (turno.inicio > ahora) resumen.proximos++;
      else resumen.sinMarcar++;
      continue;
    }

    const cobertura = nombreCobertura(turno.obraSocial);
    const monto = turno.montoCobertura ?? 0;
    const plus = turno.montoPlus ?? 0;
    const sinMonto = turno.montoCobertura == null && turno.montoPlus == null;

    resumen.atendidos++;
    resumen.plus += plus;
    resumen.total += monto + plus;
    if (cobertura === PARTICULAR) resumen.particular += monto;
    else resumen.coberturas += monto;
    if (sinMonto) resumen.atendidosSinMonto++;

    const fila = filas.get(cobertura) ?? { cobertura, consultas: 0, monto: 0, plus: 0, total: 0, sinMonto: 0 };
    fila.consultas++;
    fila.monto += monto;
    fila.plus += plus;
    fila.total += monto + plus;
    if (sinMonto) fila.sinMonto++;
    filas.set(cobertura, fila);
  }

  resumen.porCobertura = [...filas.values()].sort(
    (a, b) => b.total - a.total || b.consultas - a.consultas || a.cobertura.localeCompare(b.cobertura, "es")
  );
  return resumen;
}

/**
 * Estimado de lo que suman los turnos próximos (todavía sin marcar) si
 * vienen todos, con los aranceles vigentes.
 */
export function proyectarIngresos(turnos: TurnoIngreso[], aranceles: Aranceles, ahora: Date): number {
  let total = 0;
  for (const turno of turnos) {
    if (turno.asistencia !== null || turno.inicio <= ahora) continue;
    const { montoCobertura, montoPlus } = montosVigentes(turno.obraSocial, aranceles);
    total += (montoCobertura ?? 0) + (montoPlus ?? 0);
  }
  return total;
}

/** Ingresos atendidos por mes ("YYYY-MM" → particular/coberturas/plus). */
export function ingresosPorMes(
  turnos: TurnoIngreso[],
  meses: string[]
): { mes: string; particular: number; coberturas: number; plus: number; total: number }[] {
  const porMes = new Map(meses.map((mes) => [mes, { mes, particular: 0, coberturas: 0, plus: 0, total: 0 }]));
  for (const turno of turnos) {
    if (turno.asistencia !== "ASISTIO") continue;
    const fila = porMes.get(mesDeFechaBA(turno.inicio));
    if (!fila) continue;
    const monto = turno.montoCobertura ?? 0;
    const plus = turno.montoPlus ?? 0;
    if (nombreCobertura(turno.obraSocial) === PARTICULAR) fila.particular += monto;
    else fila.coberturas += monto;
    fila.plus += plus;
    fila.total += monto + plus;
  }
  return meses.map((mes) => porMes.get(mes)!);
}
