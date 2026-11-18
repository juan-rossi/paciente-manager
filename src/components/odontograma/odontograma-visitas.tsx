"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/patient-form/fields";
import { formatFechaCorta } from "@/components/patient-form/utils";
import type { OdontogramaTipo } from "@/lib/odontograma";
import type { PracticaVisita } from "@/lib/practica-odontologica";

export type VisitaHistorial = {
  id: string;
  tipo: OdontogramaTipo;
  // YYYY-MM-DD
  fecha: string;
  nota: string;
  practicas: PracticaVisita[];
};

// Con más visitas que esto, se muestran las últimas y un botón para ver todas.
const VISIBLES = 5;

// Tarjeta del detalle de paciente (solo odontólogos), debajo del odontograma:
// las visitas en las que se realizó al menos una práctica, de la más reciente a
// la más vieja. Las visitas sin prácticas no se muestran.
export function OdontogramaVisitas({
  visitas: todas,
}: {
  visitas: VisitaHistorial[];
}) {
  const [verTodas, setVerTodas] = useState(false);
  const visitas = todas.filter((v) => v.practicas.length > 0);
  if (visitas.length === 0) return null;

  const mostradas = verTodas ? visitas : visitas.slice(0, VISIBLES);
  const ocultas = visitas.length - mostradas.length;

  return (
    <FormSection
      title="Historial de prácticas realizadas"
      icon={History}
      contentClassName="bg-card sm:grid-cols-1 lg:grid-cols-1"
      headerExtra={
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {visitas.length} {visitas.length === 1 ? "visita" : "visitas"}
        </span>
      }
    >
      <ol className="flex flex-col">
        {mostradas.map((v, i) => {
          const ultima = i === mostradas.length - 1;
          const nota = v.nota.trim();
          return (
            <li key={v.id} className={cn("relative pl-7", !ultima && "pb-5")}>
              {/* Línea que une los nodos. */}
              {!ultima && (
                <span
                  aria-hidden
                  className="absolute top-4 bottom-0 left-[6px] w-0.5 bg-border"
                />
              )}
              <span
                aria-hidden
                className="absolute top-[3px] left-0 size-3.5 rounded-full border-2 border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500"
              />

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {formatFechaCorta(v.fecha)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    v.tipo === "INICIAL"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {v.tipo === "INICIAL" ? "Inicial" : "Control"}
                </span>
              </div>

              {nota && (
                <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                  {nota}
                </p>
              )}

              <ul className="mt-2 flex flex-col divide-y divide-border rounded-lg border border-border bg-muted/30">
                {v.practicas.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-baseline gap-2 px-3 py-2 text-xs"
                  >
                    <span className="shrink-0 rounded bg-muted px-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {p.codigo}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold tabular-nums">
                        {p.pieza ?? "Boca completa"} ·{" "}
                      </span>
                      {p.descripcion}
                      {p.caras.length > 0 && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({p.caras.join(" ")})
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>

      {visitas.length > VISIBLES && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVerTodas((v) => !v)}
          >
            {verTodas ? "Ver menos" : `Ver las ${ocultas} anteriores`}
          </Button>
        </div>
      )}
    </FormSection>
  );
}
