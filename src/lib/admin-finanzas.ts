import { prisma } from "@/lib/prisma";
import { inicioDeMes, mesDeFecha, sumarMeses, type Cotizacion } from "@/lib/admin-costos-ia";

/**
 * Estado de resultados mes a mes para `/admin/finanzas`:
 *
 * - Ingresos: cobros aprobados de MercadoPago (`PagoSuscripcion`), recurrentes
 *   y pagos únicos, por la fecha en que se registraron.
 * - Gastos: tabla `Gasto` (ARS).
 * - Costos IA: `UsoIA` en USD convertido con la cotización de cada mes (la
 *   misma que usa `/admin/finanzas/costos-ia`, heredada si el mes no tiene).
 *
 * Mismo criterio que `admin-metrics.ts`: se trae el rango y se agrupa en JS.
 */

export const MESES_ESTADO_RESULTADOS = 6;

export type MesResultado = {
  mes: string;
  ingresos: number;
  cobros: number;
  gastos: number;
  costoIAUsd: number;
  // null = no hay ninguna cotización cargada para convertir el mes.
  costoIAArs: number | null;
  cotizacion: Cotizacion | null;
  costos: number;
  resultado: number;
  // null cuando no hubo ingresos.
  margen: number | null;
};

// `Gasto.fecha` se guarda como medianoche UTC del día elegido (ver
// gasto-schema.ts), así que el mes sale de la fecha UTC -- en hora de
// Argentina un gasto del día 1 caería en el mes anterior.
function mesDeGasto(fecha: Date): string {
  return fecha.toISOString().slice(0, 7);
}

export async function getEstadoResultados(hastaMes: string): Promise<MesResultado[]> {
  const meses = Array.from({ length: MESES_ESTADO_RESULTADOS }, (_, i) =>
    sumarMeses(hastaMes, i - MESES_ESTADO_RESULTADOS + 1)
  );
  const desde = inicioDeMes(meses[0]);
  const hasta = inicioDeMes(sumarMeses(hastaMes, 1));

  const [pagos, gastos, usos, cotizaciones] = await Promise.all([
    prisma.pagoSuscripcion.findMany({
      where: { estado: "approved", createdAt: { gte: desde, lt: hasta } },
      select: { monto: true, createdAt: true },
    }),
    prisma.gasto.findMany({
      where: { fecha: { gte: new Date(`${meses[0]}-01T00:00:00Z`), lt: new Date(`${sumarMeses(hastaMes, 1)}-01T00:00:00Z`) } },
      select: { monto: true, fecha: true },
    }),
    prisma.usoIA.findMany({
      where: { createdAt: { gte: desde, lt: hasta } },
      select: { costoUsd: true, createdAt: true },
    }),
    // Una sola consulta en vez de un `getCotizacion` por mes: la cotización de
    // cada mes es la última cargada hasta ese mes (mismo criterio).
    prisma.cotizacionDolar.findMany({
      where: { mes: { lte: hastaMes } },
      orderBy: { mes: "desc" },
      select: { mes: true, arsPorUsd: true },
    }),
  ]);
  const cotizacionDe = (mes: string): Cotizacion | null => cotizaciones.find((c) => c.mes <= mes) ?? null;

  return meses.map((mes) => {
    const pagosMes = pagos.filter((p) => mesDeFecha(p.createdAt) === mes);
    const ingresos = pagosMes.reduce((sum, p) => sum + p.monto, 0);
    const gastosMes = gastos.filter((g) => mesDeGasto(g.fecha) === mes).reduce((sum, g) => sum + g.monto, 0);
    const costoIAUsd = usos.filter((u) => mesDeFecha(u.createdAt) === mes).reduce((sum, u) => sum + u.costoUsd, 0);
    const cotizacion = cotizacionDe(mes);
    const costoIAArs = cotizacion ? costoIAUsd * cotizacion.arsPorUsd : costoIAUsd === 0 ? 0 : null;
    const costos = gastosMes + (costoIAArs ?? 0);
    const resultado = ingresos - costos;
    return {
      mes,
      ingresos,
      cobros: pagosMes.length,
      gastos: gastosMes,
      costoIAUsd,
      costoIAArs,
      cotizacion,
      costos,
      resultado,
      margen: ingresos > 0 ? (resultado / ingresos) * 100 : null,
    };
  });
}
