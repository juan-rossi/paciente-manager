import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Mail,
  Stethoscope,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getMedicoDetalle, formatDiasParaVencer, formatFechaCorta } from "@/lib/admin-metrics";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function AdminMedicoDetallePage({ params }: Props) {
  const { id } = await params;
  const medico = await getMedicoDetalle(id);
  if (!medico) notFound();

  const urgente = medico.estado === "ACTIVO" && medico.diasParaVencer !== null && medico.diasParaVencer <= 7;
  const maxUso = Math.max(1, ...medico.usoMensual.map((m) => m.pacientes));

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/admin/medicos"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Médicos
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-13 shrink-0 items-center justify-center rounded-full bg-accent font-heading text-lg font-semibold text-accent-foreground">
              {iniciales(medico.nombreCompleto)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-lg font-semibold">{medico.nombreCompleto}</h1>
                {medico.estado === "ACTIVO" ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                  >
                    Activo
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactivo</Badge>
                )}
                <Badge variant="secondary">{medico.planLabel}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {medico.nroMatricula ? `MP ${medico.nroMatricula} · ` : ""}
                {medico.email}
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" nativeButton={false} render={<a href={`mailto:${medico.email}`} />}>
            <Mail className="size-3.5" />
            Enviar email
          </Button>
        </CardContent>
      </Card>

      {medico.vencimiento && (
        <div
          className={
            urgente
              ? "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-5 py-4 " +
                ((medico.diasParaVencer ?? 99) <= 3
                  ? "border-red-200 bg-red-50 text-destructive dark:border-red-900 dark:bg-red-950"
                  : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300")
              : "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-5 py-4"
          }
        >
          <div className="flex items-center gap-3">
            <Clock className="size-5" />
            <div>
              <div className="text-xs font-semibold tracking-wide uppercase opacity-80">Vencimiento</div>
              <div className="mt-0.5 font-heading text-base font-semibold">
                {formatDiasParaVencer(medico.diasParaVencer)} — {formatFechaCorta(medico.vencimiento)}
              </div>
            </div>
          </div>
          {medico.esTrial && medico.estado === "ACTIVO" && (
            <span className="text-sm opacity-90">Sin conversión a plan pago registrada</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total pacientes" value={String(medico.pacientesCount)} />
        <StatCard icon={CalendarDays} label="Total turnos" value={String(medico.turnosCount)} />
        <StatCard
          icon={Clock}
          label="Última actividad"
          value={medico.ultimaActividad ? formatFechaCorta(medico.ultimaActividad) : "Sin actividad todavía"}
        />
        <StatCard
          icon={Stethoscope}
          label="Secretarias asignadas"
          value={
            medico.secretarias.length > 0 ? `${medico.secretarias.length} · ${medico.secretarias.join(", ")}` : "0"
          }
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-1">
            <h2 className="font-heading text-sm font-semibold">Historial de suscripción</h2>
            <div className="mt-4 flex flex-col">
              {medico.historial.map((evento, i) => (
                <div key={i} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < medico.historial.length - 1 && (
                    <span className="absolute top-3.5 left-[5px] h-full w-px bg-border" />
                  )}
                  <span className="relative mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {evento.fecha ? formatFechaCorta(evento.fecha) : "Estado actual"}
                      {evento.estimado && " (estimado)"}
                    </div>
                    <div className="text-sm font-semibold">{evento.titulo}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{evento.descripcion}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1">
            <h2 className="font-heading text-sm font-semibold">Uso mensual</h2>
            <p className="text-xs text-muted-foreground">Pacientes nuevos cargados por mes</p>
            <div className="mt-4 flex h-36 items-end gap-4 border-b border-border pb-0.5">
              {medico.usoMensual.map((m) => (
                <div key={m.mes} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-semibold">{m.pacientes}</span>
                  <div
                    className="w-7 rounded-t bg-brand-secondary"
                    style={{ height: `${Math.max(4, (m.pacientes / maxUso) * 108)}px` }}
                  />
                  <span className="text-[11px] text-muted-foreground">{m.mes}</span>
                </div>
              ))}
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

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" />
          {label}
        </div>
        <div className="font-heading text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
