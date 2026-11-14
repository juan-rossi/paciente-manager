"use client";

import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CODIGO_INFO,
  CODIGOS_CARA,
  CODIGOS_PIEZA,
  TIPOS_MARCA,
  type CodigoOdonto,
  type TipoMarca,
} from "@/lib/odontograma";
import { COLOR_TIPO } from "./diente-svg";

export type Herramienta = { tipo: "marca"; codigo: CodigoOdonto } | { tipo: "borrar" };

type Props = {
  herramienta: Herramienta;
  onHerramientaChange: (h: Herramienta) => void;
  tipoMarca: TipoMarca;
  onTipoMarcaChange: (t: TipoMarca) => void;
};

const TIPO_LABEL: Record<TipoMarca, string> = {
  existente: "Existente",
  requerida: "Requerida",
};

export function OdontogramaToolbar({
  herramienta,
  onHerramientaChange,
  tipoMarca,
  onTipoMarcaChange,
}: Props) {
  const borrando = herramienta.tipo === "borrar";
  const color = COLOR_TIPO[tipoMarca];

  function chip(codigo: CodigoOdonto) {
    const activo = herramienta.tipo === "marca" && herramienta.codigo === codigo;
    const info = CODIGO_INFO[codigo];
    return (
      <button
        key={codigo}
        type="button"
        aria-pressed={activo}
        onClick={() => onHerramientaChange({ tipo: "marca", codigo })}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activo
            ? "border-foreground/80 bg-foreground/5 text-foreground shadow-xs"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span
          className="min-w-5 text-center font-mono text-[11px] font-bold"
          style={{ color }}
          aria-hidden
        >
          {info.simbolo}
        </span>
        {info.label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="radiogroup"
          aria-label="Tipo de prestación"
          className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5"
        >
          {TIPOS_MARCA.map((tipo) => {
            const activo = tipoMarca === tipo;
            return (
              <button
                key={tipo}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => {
                  onTipoMarcaChange(tipo);
                  if (borrando) onHerramientaChange({ tipo: "marca", codigo: "CARIES" });
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activo && !borrando
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="size-2.5 rounded-full" style={{ background: COLOR_TIPO[tipo] }} />
                {TIPO_LABEL[tipo]}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-pressed={borrando}
          onClick={() => onHerramientaChange({ tipo: "borrar" })}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
            borrando
              ? "border-foreground/80 bg-foreground/5 text-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Eraser className="size-3.5" />
          Borrar
        </button>
        <p className="text-xs text-muted-foreground">
          {borrando
            ? "Clic en una cara para limpiarla, o en el número para limpiar la pieza entera."
            : "Elegí una marca y hacé clic en el diente. Repetir el clic la quita."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Grupo titulo="Por cara">{CODIGOS_CARA.map(chip)}</Grupo>
        <Grupo titulo="Pieza completa">{CODIGOS_PIEZA.map(chip)}</Grupo>
      </div>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {titulo}
      </legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}
