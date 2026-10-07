import { prisma } from "@/lib/prisma";
import { esActivo, precioMensualEquivalente, type PlanDuracion } from "@/lib/plan";
import { dateParamToDateBA, formatDateParamBA } from "@/lib/timezone";

/**
 * Reporte de uso y costo de las funciones de IA Premium (dictado y resumen)
 * para el panel admin (`/admin/costos-ia`, Dashboard y ficha del médico).
 * Lee la tabla `UsoIA` (una fila por pedido, ver `src/lib/ia-costos.ts`) y
 * agrupa en JS por médico y mes -- mismo criterio que `admin-metrics.ts`
 * mientras el volumen sea chico.
 *
 * Los meses ("2026-10") se cortan en hora de Argentina.
 *
 * "Promedio mensual" = promedio de los últimos 3 meses cerrados, contando solo
 * los meses desde el primer uso de IA del médico. No guardamos el historial
 * de planes mes a mes, y la IA solo funciona con Premium vigente, así que el
 * primer uso es la mejor aproximación a "desde que es Premium".
 */

export const MESES_PROMEDIO = 3;

const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ---------------------------------------------------------------------------
// Meses
// ---------------------------------------------------------------------------

export function mesDeFecha(fecha: Date): string {
  return formatDateParamBA(fecha).slice(0, 7);
}

export function mesActual(): string {
  return mesDeFecha(new Date());
}

export function esMesValido(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

export function sumarMeses(mes: string, cantidad: number): string {
  const [year, month] = mes.split("-").map(Number);
  const total = year * 12 + (month - 1) + cantidad;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function inicioDeMes(mes: string): Date {
  return dateParamToDateBA(`${mes}-01`)!;
}

export function labelMes(mes: string): string {
  const [year, month] = mes.split("-").map(Number);
  return `${MESES_LARGOS[month - 1]} ${year}`;
}

// ---------------------------------------------------------------------------
// Cotización del dólar
// ---------------------------------------------------------------------------

export type Cotizacion = {
  arsPorUsd: number;
  // Mes del que sale el valor: puede ser anterior al consultado si ese mes
  // todavía no tiene una cargada.
  mes: string;
};

export async function getCotizacion(mes: string): Promise<Cotizacion | null> {
  const fila = await prisma.cotizacionDolar.findFirst({
    where: { mes: { lte: mes } },
    orderBy: { mes: "desc" },
  });
  return fila ? { arsPorUsd: fila.arsPorUsd, mes: fila.mes } : null;
}

// ---------------------------------------------------------------------------
// Agregación
// ---------------------------------------------------------------------------

export type UsoMes = {
  minutos: number;
  dictados: number;
  resumenes: number;
  tokens: number;
  costoUsd: number;
};

const USO_VACIO: UsoMes = { minutos: 0, dictados: 0, resumenes: 0, tokens: 0, costoUsd: 0 };

type FilaUso = {
  doctorId: string;
  tipo: "DICTADO" | "RESUMEN";
  segundosAudio: number | null;
  tokensEntrada: number | null;
  tokensSalida: number | null;
  costoUsd: number;
  createdAt: Date;
};

function sumarFila(uso: UsoMes, fila: FilaUso): UsoMes {
  return {
    minutos: uso.minutos + (fila.segundosAudio ?? 0) / 60,
    dictados: uso.dictados + (fila.tipo === "DICTADO" ? 1 : 0),
    resumenes: uso.resumenes + (fila.tipo === "RESUMEN" ? 1 : 0),
    tokens: uso.tokens + (fila.tokensEntrada ?? 0) + (fila.tokensSalida ?? 0),
    costoUsd: uso.costoUsd + fila.costoUsd,
  };
}

// doctorId -> mes -> uso
function agruparPorDoctorYMes(filas: FilaUso[]): Map<string, Map<string, UsoMes>> {
  const resultado = new Map<string, Map<string, UsoMes>>();
  for (const fila of filas) {
    const mes = mesDeFecha(fila.createdAt);
    const porMes = resultado.get(fila.doctorId) ?? new Map<string, UsoMes>();
    porMes.set(mes, sumarFila(porMes.get(mes) ?? USO_VACIO, fila));
    resultado.set(fila.doctorId, porMes);
  }
  return resultado;
}

export type PromedioMensual = {
  minutos: number;
  resumenes: number;
  costoUsd: number;
  mesesConsiderados: number;
};

function promedioMensual(
  porMes: Map<string, UsoMes> | undefined,
  primerUso: Date | null,
  mesesVentana: string[]
): PromedioMensual | null {
  if (!primerUso) return null;
  const mesPrimerUso = mesDeFecha(primerUso);
  const meses = mesesVentana.filter((m) => m >= mesPrimerUso);
  if (meses.length === 0) return null;
  const total = meses.reduce((acc, m) => {
    const uso = porMes?.get(m) ?? USO_VACIO;
    return { minutos: acc.minutos + uso.minutos, resumenes: acc.resumenes + uso.resumenes, costoUsd: acc.costoUsd + uso.costoUsd };
  }, { minutos: 0, resumenes: 0, costoUsd: 0 });
  return {
    minutos: total.minutos / meses.length,
    resumenes: total.resumenes / meses.length,
    costoUsd: total.costoUsd / meses.length,
    mesesConsiderados: meses.length,
  };
}

function mesesVentanaPromedio(): string[] {
  const actual = mesActual();
  return Array.from({ length: MESES_PROMEDIO }, (_, i) => sumarMeses(actual, i - MESES_PROMEDIO));
}

async function fetchUsos(where: { doctorId?: string; desde: Date; hasta: Date }): Promise<FilaUso[]> {
  return prisma.usoIA.findMany({
    where: {
      doctorId: where.doctorId,
      createdAt: { gte: where.desde, lt: where.hasta },
    },
    select: {
      doctorId: true,
      tipo: true,
      segundosAudio: true,
      tokensEntrada: true,
      tokensSalida: true,
      costoUsd: true,
      createdAt: true,
    },
  });
}

type PlanPago = {
  plan: "BASICA" | "PREMIUM";
  planDuracion: PlanDuracion | null;
  planEndsAt: Date | null;
  trialEndsAt: Date | null;
};

// Precio mensual que paga hoy, o null si no tiene plan pago vigente (trial).
function precioMensualPagado(doctor: PlanPago): number | null {
  if (!doctor.planEndsAt || !doctor.planDuracion || !esActivo(doctor)) return null;
  return precioMensualEquivalente(doctor.plan, doctor.planDuracion);
}

function porcentajeDelPlan(costoUsd: number, cotizacion: Cotizacion | null, precioMensual: number | null) {
  if (!cotizacion || !precioMensual) return null;
  return ((costoUsd * cotizacion.arsPorUsd) / precioMensual) * 100;
}

// ---------------------------------------------------------------------------
// Pantalla /admin/costos-ia
// ---------------------------------------------------------------------------

export type FilaMedicoCostosIA = {
  id: string;
  nombreCompleto: string;
  esPremiumVigente: boolean;
  mes: UsoMes;
  promedio: PromedioMensual | null;
  // Costo promedio sobre el precio mensual de su plan (solo planes pagos).
  porcentajePlan: number | null;
};

export type CostosIAData = {
  mes: string;
  mesLabel: string;
  mesesDisponibles: string[];
  mesesPromedio: string[];
  totales: UsoMes;
  medicosPremium: number;
  medicosConUso: number;
  cotizacionMes: Cotizacion | null;
  cotizacionActual: Cotizacion | null;
  filas: FilaMedicoCostosIA[];
};

export async function getCostosIA(mes: string): Promise<CostosIAData> {
  const actual = mesActual();
  const mesesPromedio = mesesVentanaPromedio();
  const desde = inicioDeMes(mes < mesesPromedio[0] ? mes : mesesPromedio[0]);
  const hasta = inicioDeMes(sumarMeses(mes > actual ? mes : actual, 1));

  const [filas, primerosUsos, primerUsoGlobal, cotizacionMes, cotizacionActual] = await Promise.all([
    fetchUsos({ desde, hasta }),
    prisma.usoIA.groupBy({ by: ["doctorId"], _min: { createdAt: true } }),
    prisma.usoIA.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
    getCotizacion(mes),
    getCotizacion(actual),
  ]);

  const usoPorDoctor = agruparPorDoctorYMes(filas);
  const primerUsoPorDoctor = new Map(primerosUsos.map((p) => [p.doctorId, p._min.createdAt]));

  const doctores = await prisma.user.findMany({
    where: {
      role: "DOCTOR",
      OR: [{ plan: "PREMIUM" }, { id: { in: [...usoPorDoctor.keys()] } }],
    },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      plan: true,
      planDuracion: true,
      planEndsAt: true,
      trialEndsAt: true,
    },
  });

  const filasMedicos: FilaMedicoCostosIA[] = doctores
    .map((d) => {
      const porMes = usoPorDoctor.get(d.id);
      const promedio = promedioMensual(porMes, primerUsoPorDoctor.get(d.id) ?? null, mesesPromedio);
      return {
        id: d.id,
        nombreCompleto: `${d.nombre} ${d.apellido}`.trim(),
        esPremiumVigente: d.plan === "PREMIUM" && esActivo(d),
        mes: porMes?.get(mes) ?? USO_VACIO,
        promedio,
        porcentajePlan: promedio
          ? porcentajeDelPlan(promedio.costoUsd, cotizacionActual, precioMensualPagado(d))
          : null,
      };
    })
    // Médicos que ya no son Premium y no usaron IA en ningún mes visible no aportan nada.
    .filter((f) => f.esPremiumVigente || f.mes.costoUsd > 0 || f.promedio)
    .sort(
      (a, b) =>
        (b.promedio?.costoUsd ?? 0) - (a.promedio?.costoUsd ?? 0) ||
        b.mes.costoUsd - a.mes.costoUsd ||
        a.nombreCompleto.localeCompare(b.nombreCompleto)
    );

  const totales = filasMedicos.reduce(
    (acc, f) => ({
      minutos: acc.minutos + f.mes.minutos,
      dictados: acc.dictados + f.mes.dictados,
      resumenes: acc.resumenes + f.mes.resumenes,
      tokens: acc.tokens + f.mes.tokens,
      costoUsd: acc.costoUsd + f.mes.costoUsd,
    }),
    USO_VACIO
  );

  // Selector: desde el mes del primer uso registrado (o el actual) hasta hoy.
  const primerMes = primerUsoGlobal ? mesDeFecha(primerUsoGlobal.createdAt) : actual;
  const mesesDisponibles: string[] = [];
  for (let m = actual; m >= primerMes; m = sumarMeses(m, -1)) mesesDisponibles.push(m);

  return {
    mes,
    mesLabel: labelMes(mes),
    mesesDisponibles,
    mesesPromedio,
    totales,
    medicosPremium: filasMedicos.filter((f) => f.esPremiumVigente).length,
    medicosConUso: filasMedicos.filter((f) => f.mes.costoUsd > 0).length,
    cotizacionMes,
    cotizacionActual,
    filas: filasMedicos,
  };
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type ResumenCostoIAMes = {
  mes: string;
  costoUsd: number;
  cotizacion: Cotizacion | null;
};

export async function getResumenCostoIAMes(): Promise<ResumenCostoIAMes> {
  const mes = mesActual();
  const [agregado, cotizacion] = await Promise.all([
    prisma.usoIA.aggregate({
      where: { createdAt: { gte: inicioDeMes(mes), lt: inicioDeMes(sumarMeses(mes, 1)) } },
      _sum: { costoUsd: true },
    }),
    getCotizacion(mes),
  ]);
  return { mes, costoUsd: agregado._sum.costoUsd ?? 0, cotizacion };
}

// ---------------------------------------------------------------------------
// Ficha del médico
// ---------------------------------------------------------------------------

export type UsoIAMedico = {
  promedio: PromedioMensual | null;
  porcentajePlan: number | null;
  mesActual: UsoMes;
};

export async function getUsoIAMedico(doctorId: string): Promise<UsoIAMedico | null> {
  const actual = mesActual();
  const mesesPromedio = mesesVentanaPromedio();
  const [doctor, filas, primerUso, cotizacion] = await Promise.all([
    prisma.user.findFirst({
      where: { id: doctorId, role: "DOCTOR" },
      select: { plan: true, planDuracion: true, planEndsAt: true, trialEndsAt: true },
    }),
    fetchUsos({
      doctorId,
      desde: inicioDeMes(mesesPromedio[0]),
      hasta: inicioDeMes(sumarMeses(actual, 1)),
    }),
    prisma.usoIA.findFirst({
      where: { doctorId },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    getCotizacion(actual),
  ]);
  // Sin Premium y sin usos registrados no hay nada que mostrar.
  if (!doctor || (doctor.plan !== "PREMIUM" && !primerUso)) return null;
  const porMes = agruparPorDoctorYMes(filas).get(doctorId);
  const promedio = promedioMensual(porMes, primerUso?.createdAt ?? null, mesesPromedio);
  return {
    promedio,
    porcentajePlan: promedio ? porcentajeDelPlan(promedio.costoUsd, cotizacion, precioMensualPagado(doctor)) : null,
    mesActual: porMes?.get(actual) ?? USO_VACIO,
  };
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export function formatUsd(monto: number): string {
  // Los costos por médico son centavos o fracciones: con 2 decimales un mes
  // de poco uso quedaría en "US$ 0,00".
  const decimales = monto > 0 && monto < 0.1 ? 3 : 2;
  return `US$ ${monto.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}`;
}

export function formatNumero(valor: number, decimales = 0): string {
  return valor.toLocaleString("es-AR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}
