import Link from "next/link";
import { AudioLines, DollarSign, FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CotizacionForm, SelectorMes } from "@/components/admin/costos-ia-controles";
import {
  getCostosIA,
  esMesValido,
  formatNumero,
  formatUsd,
  labelMes,
  mesActual,
  MESES_PROMEDIO,
  type FilaMedicoCostosIA,
} from "@/lib/admin-costos-ia";
import { formatMoneyARS } from "@/lib/admin-metrics";

// El mes en curso cambia con cada dictado/resumen -- sin cache.
export const dynamic = "force-dynamic";

// Por encima de este % del precio mensual del plan, el uso se marca como alto.
const UMBRAL_USO_ALTO_PCT = 5;

type SearchParams = Promise<{ mes?: string }>;

export default async function AdminCostosIAPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const actual = mesActual();
  const mes = sp.mes && esMesValido(sp.mes) && sp.mes <= actual ? sp.mes : actual;
  const data = await getCostosIA(mes);

  const cotizacion = data.cotizacionMes;
  const costoArs = cotizacion ? data.totales.costoUsd * cotizacion.arsPorUsd : null;
  const maxPromedio = Math.max(0.0001, ...data.filas.map((f) => f.promedio?.costoUsd ?? 0));
  const ventana = `${labelMes(data.mesesPromedio[0])} – ${labelMes(data.mesesPromedio[MESES_PROMEDIO - 1])}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold">Costos IA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dictado (Groq) y resumen (Claude Haiku) de los médicos Premium
          </p>
        </div>
        <SelectorMes
          mes={mes}
          meses={data.mesesDisponibles.map((m) => ({
            value: m,
            label: m === actual ? `${labelMes(m)} (en curso)` : labelMes(m),
          }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label={`Costo · ${data.mesLabel}`}
          value={formatUsd(data.totales.costoUsd)}
          sub={costoArs !== null ? `≈ ${formatMoneyARS(costoArs)} ARS` : "sin cotización cargada"}
        />
        <KpiCard
          icon={AudioLines}
          label="Minutos dictados"
          value={formatNumero(data.totales.minutos)}
          sub={`en ${formatNumero(data.totales.dictados)} dictado${data.totales.dictados === 1 ? "" : "s"}`}
        />
        <KpiCard
          icon={FileText}
          label="Resúmenes"
          value={formatNumero(data.totales.resumenes)}
          sub={`${formatNumero(data.totales.tokens / 1000, 1)} mil tokens`}
        />
        <KpiCard
          icon={Sparkles}
          label="Médicos Premium"
          value={String(data.medicosPremium)}
          sub={`${data.medicosConUso} usaron IA en el mes`}
        />
      </div>

      <Card>
        <CardContent>
          <CotizacionForm
            key={mes}
            mes={mes}
            mesLabel={data.mesLabel}
            arsPorUsd={cotizacion?.arsPorUsd ?? null}
            heredadaDe={cotizacion && cotizacion.mes !== mes ? labelMes(cotizacion.mes) : null}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-sm font-semibold">Por médico</h2>
          <p className="text-xs text-muted-foreground">Promedio mensual: {ventana}</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {data.filas.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Todavía no hay médicos Premium ni usos de IA registrados.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Médico</TableHead>
                  <TableHead className="text-right">Min/mes prom.</TableHead>
                  <TableHead className="text-right">Resúmenes/mes prom.</TableHead>
                  <TableHead className="text-right">Costo/mes prom.</TableHead>
                  <TableHead className="text-right">% del plan</TableHead>
                  <TableHead className="text-right">{data.mesLabel}</TableHead>
                  <TableHead className="pr-5">Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.filas.map((f) => (
                  <FilaMedico key={f.id} fila={f} maxPromedio={maxPromedio} />
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          El promedio toma los últimos {MESES_PROMEDIO} meses cerrados, contando desde el mes del primer uso de IA
          de cada médico. “% del plan” compara el costo promedio en pesos (cotización del mes en curso) con el
          precio mensual que paga; no aplica a médicos en trial. Los costos son estimados con los precios de{" "}
          <code>src/lib/ia-costos.ts</code>.
        </p>
      </div>
    </div>
  );
}

function FilaMedico({ fila, maxPromedio }: { fila: FilaMedicoCostosIA; maxPromedio: number }) {
  const p = fila.promedio;
  const nivel =
    !p || p.costoUsd === 0
      ? { label: "Sin uso", className: "border-border text-muted-foreground" }
      : fila.porcentajePlan !== null && fila.porcentajePlan >= UMBRAL_USO_ALTO_PCT
        ? {
            label: "Alto",
            className: "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400",
          }
        : {
            label: "Normal",
            className: "border-emerald-300 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400",
          };

  return (
    <TableRow>
      <TableCell className="pl-5">
        <div className="flex flex-col">
          <Link href={`/admin/medicos/${fila.id}`} className="font-medium hover:underline">
            {fila.nombreCompleto}
          </Link>
          {!fila.esPremiumVigente && <span className="text-xs text-muted-foreground">Ya no es Premium</span>}
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">{p ? formatNumero(p.minutos) : "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{p ? formatNumero(p.resumenes) : "—"}</TableCell>
      <TableCell className="text-right tabular-nums">{p ? formatUsd(p.costoUsd) : "—"}</TableCell>
      <TableCell className="text-right tabular-nums">
        {fila.porcentajePlan !== null ? `${formatNumero(fila.porcentajePlan, 1)} %` : "—"}
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {formatNumero(fila.mes.minutos)} min · {fila.mes.resumenes} res. · {formatUsd(fila.mes.costoUsd)}
      </TableCell>
      <TableCell className="pr-5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${((p?.costoUsd ?? 0) / maxPromedio) * 100}%` }}
            />
          </div>
          <Badge variant="outline" className={nivel.className}>
            {nivel.label}
          </Badge>
        </div>
      </TableCell>
    </TableRow>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Icon className="size-3.5" />
          {label}
        </div>
        <div className="font-heading text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
