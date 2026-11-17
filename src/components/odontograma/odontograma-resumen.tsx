import Link from "next/link";
import { Pencil, Plus, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/patient-form/fields";
import { formatFechaCorta } from "@/components/patient-form/utils";
import { diffOdontograma, type DatosOdontograma, type OdontogramaTipo } from "@/lib/odontograma";
import type { PracticaVisita } from "@/lib/practica-odontologica";
import { OdontogramaGrid } from "./odontograma-grid";
import { Leyenda, PlanTratamiento } from "./panel-odontograma";

export type VisitaResumen = {
  tipo: OdontogramaTipo;
  // YYYY-MM-DD
  fecha: string;
  nota: string;
  datos: DatosOdontograma;
  practicas: PracticaVisita[];
};

export type OdontogramaResumenProps = {
  patientId: string;
  // null = el paciente todavía no tiene odontograma.
  ultima: VisitaResumen | null;
  // Visita guardada antes que la última, para resaltar lo que cambió.
  anterior: { datos: DatosOdontograma } | null;
  totalVisitas: number;
};

// Tarjeta del detalle de paciente (solo odontólogos): el estado de la boca en
// la última visita, en lectura, con acceso directo a la pestaña de edición.
export function OdontogramaResumen({ patientId, ultima, anterior, totalVisitas }: OdontogramaResumenProps) {
  const href = `/patients/${patientId}/edit?tab=odontograma`;

  if (!ultima) {
    return (
      <FormSection title="Odontograma" icon={Smile} contentClassName="bg-card sm:grid-cols-1 lg:grid-cols-1">
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Este paciente todavía no tiene odontograma. Registrá el inicial para empezar a cargar
            visitas y prácticas.
          </p>
          <Button nativeButton={false} render={<Link href={href} />}>
            <Plus className="size-4" />
            Registrar odontograma inicial
          </Button>
        </div>
      </FormSection>
    );
  }

  const resaltadas = anterior ? diffOdontograma(anterior.datos, ultima.datos) : undefined;
  const nota = ultima.nota.trim();

  return (
    <FormSection
      title="Odontograma"
      icon={Smile}
      contentClassName="bg-card p-0 sm:p-0 gap-0 sm:grid-cols-1 lg:grid-cols-1"
      headerExtra={
        <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5">
          <span className="text-xs font-normal text-muted-foreground">
            Última visita: {ultima.tipo === "INICIAL" ? "inicial" : "control"} del{" "}
            {formatFechaCorta(ultima.fecha)}
            {totalVisitas > 1 && ` · ${totalVisitas} visitas`}
          </span>
          <Button size="sm" nativeButton={false} render={<Link href={href} />}>
            <Pencil className="size-3.5" />
            Abrir odontograma
          </Button>
        </span>
      }
    >
      <div className="flex flex-col">
        <div className="min-w-0 p-4 sm:p-5">
          <OdontogramaGrid datos={ultima.datos} resaltadas={resaltadas} />
          <Leyenda mostrarCambios={Boolean(resaltadas && resaltadas.size > 0)} />
        </div>

        {/* Resumen de la visita debajo del gráfico, en columnas que se apilan en pantallas chicas. */}
        <div className="grid grid-cols-1 gap-5 border-t border-border/60 p-4 sm:p-5 md:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] md:items-start">
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <h4 className="text-sm font-semibold">Realizado en esta visita</h4>
              <span className="text-xs text-muted-foreground tabular-nums">
                {ultima.practicas.length}
              </span>
            </div>
            {ultima.practicas.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                Sin prácticas registradas.
              </p>
            ) : (
              <ul className="flex max-h-60 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border bg-card">
                {ultima.practicas.map((p) => (
                  <li key={p.id} className="flex items-baseline gap-2 px-3 py-2 text-xs">
                    <span className="shrink-0 rounded bg-muted px-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {p.codigo}
                    </span>
                    <span className="min-w-0 flex-1">
                      {p.pieza && <span className="font-semibold tabular-nums">{p.pieza} · </span>}
                      {p.descripcion}
                      {p.caras.length > 0 && (
                        <span className="text-muted-foreground"> ({p.caras.join(" ")})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <PlanTratamiento datos={ultima.datos} />

          {nota && (
            <section className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold">Observaciones</h4>
              <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm whitespace-pre-wrap text-muted-foreground">
                {nota}
              </p>
            </section>
          )}
        </div>
      </div>
    </FormSection>
  );
}
