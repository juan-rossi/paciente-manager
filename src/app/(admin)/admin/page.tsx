import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock, DollarSign, Mail, MinusCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDashboardData, formatDiasParaVencer, formatMoneyARS } from "@/lib/admin-metrics";

// El estado de cada médico depende de la hora actual (trial/plan vencido o
// no) -- sin esto Next.js podría cachear la página y mostrar "activo" a un
// médico cuyo trial venció hace rato.
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const data = await getDashboardData();
  const maxAltas = Math.max(1, ...data.altasPorMes.map((m) => m.cantidad));
  const totalFinalizados = data.conversion.convirtieron + data.conversion.vencieronSinConvertir;
  const pctConvertidos = totalFinalizados > 0 ? (data.conversion.convirtieron / totalFinalizados) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resumen del negocio · Semio 360</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={CheckCircle2}
          label="Activos"
          value={String(data.activos)}
          sub={`de ${data.totalMedicos} médicos totales`}
          tone="success"
        />
        <KpiCard
          icon={MinusCircle}
          label="Inactivos"
          value={String(data.inactivos)}
          sub="trial o plan vencido"
          tone="critical"
        />
        <KpiCard
          icon={Clock}
          label="Por vencer · 7 días"
          value={String(data.porVencerEn7Dias.length)}
          sub="requieren contacto"
          tone="warning"
        />
        <KpiCard
          icon={TrendingUp}
          label="Conversión trial→pago"
          value={data.conversion.porcentaje !== null ? `${data.conversion.porcentaje}%` : "—"}
          sub={
            totalFinalizados > 0
              ? `${data.conversion.convirtieron} de ${totalFinalizados} trials finalizados`
              : "todavía no hay trials finalizados"
          }
        />
        <KpiCard
          icon={DollarSign}
          label="MRR estimado"
          value={formatMoneyARS(data.mrrEstimado)}
          sub={`ARS · ${data.medicosEnPlanPago} médico${data.medicosEnPlanPago === 1 ? "" : "s"} en plan pago`}
        />
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        Los montos de MRR usan precios de plan placeholder (<code>PLAN_PRICING</code> en{" "}
        <code>src/lib/plan.ts</code>) — el pricing final de Semio 360 todavía no está definido.
      </div>

      <Card className="py-0">
        <CardContent className="flex flex-col gap-0 p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm font-semibold">Atención requerida</h2>
              {data.porVencerEn7Dias.length > 0 && (
                <Badge variant="destructive">{data.porVencerEn7Dias.length}</Badge>
              )}
            </div>
            <Link
              href="/admin/medicos"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todos los médicos <ChevronRight className="size-3.5" />
            </Link>
          </div>
          {data.porVencerEn7Dias.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No hay médicos por vencer en los próximos 7 días.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {data.porVencerEn7Dias.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-xs font-semibold text-accent-foreground">
                      {iniciales(m.nombreCompleto)}
                    </div>
                    <div>
                      <Link href={`/admin/medicos/${m.id}`} className="text-sm font-medium hover:underline">
                        {m.nombreCompleto}
                      </Link>
                      <p className="text-xs text-muted-foreground">{m.planLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={(m.diasParaVencer ?? 99) <= 3 ? "destructive" : "outline"}
                      className={
                        (m.diasParaVencer ?? 99) <= 3
                          ? ""
                          : "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
                      }
                    >
                      <Clock className="size-3" />
                      {formatDiasParaVencer(m.diasParaVencer)}
                    </Badge>
                    <Button type="button" variant="outline" size="sm" nativeButton={false} render={<a href={`mailto:${m.email}`} />}>
                      <Mail className="size-3.5" />
                      Contactar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <h2 className="font-heading text-sm font-semibold">Altas de médicos por mes</h2>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            <div className="mt-4 flex h-36 items-end gap-3 border-b border-border pb-0.5">
              {data.altasPorMes.map((m) => (
                <div key={m.mes} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold">{m.cantidad}</span>
                  <div
                    className="w-7 rounded-t bg-primary"
                    style={{ height: `${Math.max(4, (m.cantidad / maxAltas) * 108)}px` }}
                  />
                  <span className="text-[11px] text-muted-foreground">{m.mes}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <h2 className="font-heading text-sm font-semibold">Conversión de trial a pago</h2>
            <p className="text-xs text-muted-foreground">Trials finalizados a la fecha</p>
            <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
              {totalFinalizados > 0 && (
                <>
                  <div className="bg-brand-accent" style={{ width: `${pctConvertidos}%` }} />
                  <div className="bg-muted" style={{ width: `${100 - pctConvertidos}%` }} />
                </>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm bg-brand-accent" /> Convirtieron a plan pago
                </span>
                <span className="font-semibold">{data.conversion.convirtieron}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-sm border border-border bg-muted" /> Vencieron sin convertir
                </span>
                <span className="font-semibold">{data.conversion.vencieronSinConvertir}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3 text-muted-foreground">
                <span>Actualmente en trial</span>
                <span className="font-semibold">{data.conversion.enTrialActualmente}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function iniciales(nombreCompleto: string): string {
  return nombreCompleto
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  tone?: "success" | "warning" | "critical";
}) {
  const toneClass =
    tone === "success"
      ? "text-brand-accent"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "critical"
          ? "text-destructive"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <Icon className="size-3.5" />
          {label}
        </div>
        <div className={`font-heading text-2xl font-semibold ${toneClass}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
