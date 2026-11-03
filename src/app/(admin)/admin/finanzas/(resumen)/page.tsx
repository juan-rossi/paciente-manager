import Link from "next/link";
import { CreditCard, DollarSign, Receipt, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SelectorMes } from "@/components/admin/costos-ia-controles";
import { getEstadoResultados, type MesResultado } from "@/lib/admin-finanzas";
import { getDashboardData, formatMoneyARS } from "@/lib/admin-metrics";
import { esMesValido, formatNumero, formatUsd, labelMes, mesActual, sumarMeses } from "@/lib/admin-costos-ia";
import { cn } from "@/lib/utils";
import { PageEnter } from "@/components/page-transition";

// El mes en curso suma cobros, gastos y usos de IA todo el tiempo -- sin cache.
export const dynamic = "force-dynamic";

const MESES_SELECTOR = 12;

type SearchParams = Promise<{ mes?: string }>;

export default async function AdminFinanzasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const actual = mesActual();
  const mes = sp.mes && esMesValido(sp.mes) && sp.mes <= actual ? sp.mes : actual;

  const [meses, negocio] = await Promise.all([getEstadoResultados(mes), getDashboardData()]);
  const sel = meses[meses.length - 1];
  const anterior = meses[meses.length - 2];
  const enCurso = mes === actual;
  const labelSel = labelMes(mes).split(" ")[0].toLowerCase();

  return (
    <PageEnter>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-semibold">Dashboard financiero</h1>
            <p className="mt-1 text-sm text-muted-foreground">Ingresos cobrados contra gastos y costos de IA</p>
          </div>
          <SelectorMes
            mes={mes}
            meses={Array.from({ length: MESES_SELECTOR }, (_, i) => sumarMeses(actual, -i)).map((m) => ({
              value: m,
              label: m === actual ? `${labelMes(m)} (en curso)` : labelMes(m),
            }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiTendencia
            icon={TrendingUp}
            label={`Ingresos · ${labelSel}`}
            value={formatMoneyARS(sel.ingresos)}
            serie={meses.map((m) => m.ingresos)}
            color="var(--primary)"
            variacion={variacion(sel.ingresos, anterior.ingresos)}
            subeEsBueno
          />
          <KpiTendencia
            icon={Receipt}
            label={`Costos · ${labelSel}`}
            value={formatMoneyARS(sel.costos)}
            serie={meses.map((m) => m.costos)}
            color="var(--destructive)"
            variacion={variacion(sel.costos, anterior.costos)}
          />
          <KpiTendencia
            icon={Wallet}
            label={`Resultado · ${labelSel}`}
            value={formatMoneyARS(sel.resultado)}
            valueClassName={sel.resultado < 0 ? "text-destructive" : "text-brand-accent"}
            serie={meses.map((m) => m.resultado)}
            color="var(--brand-accent)"
            nota={sel.margen !== null ? `margen ${formatNumero(sel.margen, 1)} %` : "sin ingresos en el mes"}
          />
        </div>

        <Card className="py-0">
          <CardContent className="flex flex-col gap-0 p-0">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-heading text-sm font-semibold">Estado de resultados</h2>
              <p className="text-xs text-muted-foreground">
                Últimos {meses.length} meses en pesos{enCurso ? " · el mes en curso todavía está abierto" : ""}
              </p>
            </div>
            <div className="overflow-x-auto">
              <EstadoResultados meses={meses} actual={actual} />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiSimple
            icon={DollarSign}
            label="MRR estimado"
            value={formatMoneyARS(negocio.mrrEstimado)}
            sub={
              sel.ingresos > 0 && negocio.mrrEstimado > 0
                ? `cobrado en ${labelSel}: ${formatNumero((sel.ingresos / negocio.mrrEstimado) * 100)} % del MRR`
                : `${negocio.medicosEnPlanPago} médico${negocio.medicosEnPlanPago === 1 ? "" : "s"} en plan pago`
            }
          />
          <KpiSimple
            icon={CreditCard}
            label={`Cobros · ${labelSel}`}
            value={String(sel.cobros)}
            sub={
              sel.cobros > 0
                ? `ticket promedio ${formatMoneyARS(sel.ingresos / sel.cobros)}`
                : `${negocio.usuariosPagos} usuarios con plan pago vigente`
            }
          />
          <KpiSimple
            icon={Sparkles}
            label={`Costo IA · ${labelSel}`}
            value={formatUsd(sel.costoIAUsd)}
            sub={
              sel.costoIAArs === null
                ? "sin cotización del dólar"
                : negocio.mrrEstimado > 0
                  ? `≈ ${formatMoneyARS(sel.costoIAArs)} · ${formatNumero((sel.costoIAArs / negocio.mrrEstimado) * 100, 1)} % del MRR`
                  : `≈ ${formatMoneyARS(sel.costoIAArs)}`
            }
            href="/admin/finanzas/costos-ia"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Ingresos = cobros aprobados por MercadoPago en el mes (suscripciones y pagos únicos, sin descontar
          comisiones). Los costos de IA se convierten con la cotización cargada en Costos IA para cada mes. El MRR
          usa precios de plan placeholder (<code>PLAN_PRICING</code> en <code>src/lib/plan.ts</code>).
        </p>
      </div>
    </PageEnter>
  );
}

function variacion(actual: number, anterior: number): number | null {
  return anterior > 0 ? ((actual - anterior) / anterior) * 100 : null;
}

function EstadoResultados({ meses, actual }: { meses: MesResultado[]; actual: string }) {
  const ultimo = meses.length - 1;
  const celda = (i: number, extra?: string) =>
    cn("px-4 py-2.5 text-right tabular-nums whitespace-nowrap", i === ultimo && "bg-primary/5", extra);
  const costoIA = (m: MesResultado) => (m.costoIAArs === null ? `${formatUsd(m.costoIAUsd)} *` : resta(m.costoIAArs));

  return (
    <table className="w-full min-w-[640px] text-sm">
      <thead>
        <tr className="border-b border-border text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <th className="px-5 py-2.5 text-left font-semibold" />
          {meses.map((m, i) => (
            <th key={m.mes} className={celda(i, "font-semibold")}>
              {labelMes(m.mes).slice(0, 3)}
              {m.mes === actual && <span className="ml-1 font-normal normal-case">(en curso)</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr className="border-b border-border">
          <td className="px-5 py-2.5 font-medium">Ingresos</td>
          {meses.map((m, i) => (
            <td key={m.mes} className={celda(i, "font-medium")}>
              {formatMoneyARS(m.ingresos)}
            </td>
          ))}
        </tr>
        <tr className="border-b border-border text-muted-foreground">
          <td className="py-2.5 pr-5 pl-9">Gastos</td>
          {meses.map((m, i) => (
            <td key={m.mes} className={celda(i)}>
              {resta(m.gastos)}
            </td>
          ))}
        </tr>
        <tr className="border-b-2 border-foreground/70 text-muted-foreground">
          <td className="py-2.5 pr-5 pl-9">Costos IA</td>
          {meses.map((m, i) => (
            <td key={m.mes} className={celda(i)}>
              {costoIA(m)}
            </td>
          ))}
        </tr>
        <tr>
          <td className="px-5 py-2.5 font-semibold">Resultado</td>
          {meses.map((m, i) => (
            <td
              key={m.mes}
              className={celda(i, cn("font-semibold", m.resultado < 0 ? "text-destructive" : "text-brand-accent"))}
            >
              {formatMoneyARS(m.resultado)}
            </td>
          ))}
        </tr>
        <tr className="text-xs text-muted-foreground">
          <td className="px-5 pb-3">Margen</td>
          {meses.map((m, i) => (
            <td key={m.mes} className={celda(i, "pt-0 pb-3")}>
              {m.margen !== null ? `${formatNumero(m.margen, 1)} %` : "—"}
            </td>
          ))}
        </tr>
      </tbody>
      {meses.some((m) => m.costoIAArs === null) && (
        <tfoot>
          <tr>
            <td colSpan={meses.length + 1} className="border-t border-border px-5 py-2.5 text-xs text-muted-foreground">
              * Sin cotización del dólar cargada: el costo de IA de ese mes no se resta del resultado.
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

function resta(monto: number): string {
  return monto === 0 ? formatMoneyARS(0) : `− ${formatMoneyARS(monto)}`;
}

function Sparkline({ serie, color }: { serie: number[]; color: string }) {
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const puntos = serie
    .map((v, i) => `${(i * 100) / (serie.length - 1)},${30 - (26 * (v - min)) / (max - min || 1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="mt-1 h-8 w-full" aria-hidden="true">
      <polygon points={`0,32 ${puntos} 100,32`} fill={color} fillOpacity={0.12} />
      <polyline points={puntos} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function KpiTendencia({
  icon: Icon,
  label,
  value,
  valueClassName,
  serie,
  color,
  variacion,
  subeEsBueno,
  nota,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClassName?: string;
  serie: number[];
  color: string;
  variacion?: number | null;
  subeEsBueno?: boolean;
  nota?: string;
}) {
  const bueno = variacion != null && (subeEsBueno ? variacion >= 0 : variacion <= 0);
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Icon className="size-3.5" />
          {label}
        </div>
        <div className={cn("font-heading text-2xl font-semibold tabular-nums", valueClassName)}>{value}</div>
        <div className="text-xs text-muted-foreground">
          {variacion != null ? (
            <>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 font-semibold",
                  bueno
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-red-50 text-destructive dark:bg-red-950"
                )}
              >
                {variacion >= 0 ? "+" : "−"}
                {formatNumero(Math.abs(variacion), 1)} %
              </span>{" "}
              vs. mes anterior
            </>
          ) : (
            (nota ?? "sin datos del mes anterior")
          )}
        </div>
        <Sparkline serie={serie} color={color} />
      </CardContent>
    </Card>
  );
}

function KpiSimple({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  href?: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Icon className="size-3.5" />
          {label}
        </div>
        <div className="font-heading text-xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">
          {sub}
          {href && (
            <>
              {" · "}
              <Link href={href} className="font-medium text-primary hover:underline">
                ver detalle
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
