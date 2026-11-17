"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  contarDientesExistentes,
  describirItem,
  planDeTratamiento,
  type CambioPieza,
  type DatosOdontograma,
  type ItemPlan,
} from "@/lib/odontograma";
import { COLOR_TIPO } from "./diente-svg";

// Piezas del panel lateral que comparten la vista de lectura y el editor.

export function PlanTratamiento({
  datos,
  onRealizada,
}: {
  datos: DatosOdontograma;
  onRealizada?: (item: ItemPlan) => void;
}) {
  const plan = planDeTratamiento(datos);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold">Plan de tratamiento</h4>
        <span className="text-xs text-muted-foreground tabular-nums">{plan.length}</span>
      </div>
      {plan.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Las prestaciones marcadas como <span style={{ color: COLOR_TIPO.requerida }}>requeridas</span>{" "}
          aparecen acá.
        </p>
      ) : (
        <ul className="flex max-h-72 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {plan.map((item) => (
            <li
              key={`${item.pieza}-${item.cara ?? "pieza"}-${item.codigo}`}
              className={cn("flex items-center gap-2 px-3 text-xs", onRealizada ? "py-1.5" : "py-2")}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: COLOR_TIPO.requerida }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">{describirItem(item)}</span>
              {onRealizada && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  title="Marcar como realizada"
                  aria-label={`Marcar como realizada: ${describirItem(item)}`}
                  onClick={() => onRealizada(item)}
                >
                  <Check />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DientesExistentes({ datos }: { datos: DatosOdontograma }) {
  return (
    <section className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
      <span className="text-sm">Dientes existentes</span>
      <span className="text-sm font-semibold tabular-nums">
        {contarDientesExistentes(datos)}
        <span className="font-normal text-muted-foreground"> / 32</span>
      </span>
    </section>
  );
}

const ETIQUETA_CAMBIO: Record<CambioPieza["tipo"], { texto: string; clase: string }> = {
  nuevo: { texto: "Nuevo", clase: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  modificado: { texto: "Cambió", clase: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  quitado: { texto: "Quitado", clase: "bg-muted text-muted-foreground" },
};

export function CambiosVisita({ cambios, desde }: { cambios: CambioPieza[]; desde: string }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold">Cambios desde el {desde}</h4>
        <span className="text-xs text-muted-foreground tabular-nums">{cambios.length}</span>
      </div>
      {cambios.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
          Sin cambios en las piezas.
        </p>
      ) : (
        <ul className="flex max-h-60 flex-col divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {cambios.map((c) => (
            <li key={c.pieza} className="flex items-start gap-2 px-3 py-2 text-xs">
              <span className="w-5 shrink-0 font-semibold tabular-nums">{c.pieza}</span>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 text-[10px] leading-4 font-semibold uppercase",
                  ETIQUETA_CAMBIO[c.tipo].clase
                )}
              >
                {ETIQUETA_CAMBIO[c.tipo].texto}
              </span>
              <span className={cn("min-w-0 flex-1", c.tipo === "quitado" && "line-through opacity-70")}>
                {c.marcas.map((m, i) => (
                  <span key={i}>
                    {i > 0 && ", "}
                    <span style={{ color: COLOR_TIPO[m.tipo] }}>{m.texto}</span>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Leyenda({ mostrarCambios }: { mostrarCambios: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 border-t border-border pt-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm" style={{ background: COLOR_TIPO.existente }} />
        Prestación existente
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm" style={{ background: COLOR_TIPO.requerida }} />
        Prestación requerida
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm" style={{ background: COLOR_TIPO.realizada }} />
        Prestación realizada
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-sm border border-border"
          style={{
            background: `repeating-linear-gradient(45deg, ${COLOR_TIPO.existente} 0 2px, transparent 2px 4px)`,
          }}
        />
        Rayado = caries
      </span>
      {mostrarCambios && (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm border-2 border-dashed border-amber-500" />
          Cambió desde la visita anterior
        </span>
      )}
    </div>
  );
}
