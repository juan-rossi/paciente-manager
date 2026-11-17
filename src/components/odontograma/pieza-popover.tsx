"use client";

import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  CODIGO_INFO,
  CODIGOS_CARA,
  CODIGOS_PIEZA,
  TIPOS_MARCA,
  type Cara,
  type CodigoOdonto,
  type CodigoPieza,
  type EstadoPieza,
  type TipoMarca,
} from "@/lib/odontograma";
import { COLOR_TIPO, DienteSvg } from "./diente-svg";

// Lo que hace un clic sobre una cara.
export type Herramienta =
  { tipo: "marca"; codigo: CodigoOdonto } | { tipo: "borrar" };

const TIPO_LABEL: Record<TipoMarca, string> = {
  existente: "Existente",
  requerida: "Requerida",
};

export function TipoMarcaSelector({
  value,
  onChange,
  className,
}: {
  value: TipoMarca;
  onChange: (t: TipoMarca) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Tipo de prestación"
      className={cn(
        "inline-flex rounded-lg border border-border bg-muted/40 p-0.5",
        className,
      )}
    >
      {TIPOS_MARCA.map((tipo) => {
        const activo = value === tipo;
        return (
          <button
            key={tipo}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => onChange(tipo)}
            className={cn(
              "inline-flex h-7 flex-1 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
              activo
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span
              className="size-2.5 rounded-full"
              style={{ background: COLOR_TIPO[tipo] }}
            />
            {TIPO_LABEL[tipo]}
          </button>
        );
      })}
    </div>
  );
}

type Props = {
  numero: number | null;
  anchor: HTMLElement | null;
  onClose: () => void;
  estado: EstadoPieza | undefined;
  tipoMarca: TipoMarca;
  onTipoMarcaChange: (t: TipoMarca) => void;
  herramientaCara: Herramienta;
  onHerramientaCaraChange: (h: Herramienta) => void;
  onCara: (cara: Cara) => void;
  onPieza: (codigo: CodigoPieza) => void;
  onLimpiar: () => void;
};

export function PiezaPopover({
  numero,
  anchor,
  onClose,
  estado,
  tipoMarca,
  onTipoMarcaChange,
  herramientaCara,
  onHerramientaCaraChange,
  onCara,
  onPieza,
  onLimpiar,
}: Props) {
  const color = COLOR_TIPO[tipoMarca];
  const marcasPieza = estado?.pieza ?? [];
  const tieneMarcas =
    marcasPieza.length > 0 || Object.values(estado?.caras ?? {}).some(Boolean);

  function chip({
    key,
    activo,
    simbolo,
    label,
    colorSimbolo,
    onClick,
  }: {
    key: string;
    activo: boolean;
    simbolo: React.ReactNode;
    label: string;
    colorSimbolo?: string;
    onClick: () => void;
  }) {
    return (
      <button
        key={key}
        type="button"
        aria-pressed={activo}
        onClick={onClick}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          activo
            ? "border-foreground/70 bg-foreground/5 font-medium text-foreground"
            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <span
          className="min-w-4 text-center font-mono text-[11px] font-bold"
          style={colorSimbolo ? { color: colorSimbolo } : undefined}
          aria-hidden
        >
          {simbolo}
        </span>
        {label}
      </button>
    );
  }

  return (
    <Popover open={numero !== null} onOpenChange={(open) => !open && onClose()}>
      <PopoverContent
        anchor={anchor}
        side="bottom"
        sideOffset={6}
        className="w-[33rem] max-w-[calc(100vw-1rem)] gap-3 p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <PopoverTitle className="text-sm font-semibold">
            Pieza {numero}
          </PopoverTitle>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            onClick={onLimpiar}
            disabled={!tieneMarcas}
          >
            <Eraser className="size-3.5" />
            Limpiar pieza
          </Button>
        </div>

        <TipoMarcaSelector
          value={tipoMarca}
          onChange={onTipoMarcaChange}
          className="w-full"
        />

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Por cara
          </legend>
          <div className="flex items-start gap-3">
            {numero !== null && (
              <DienteSvg
                numero={numero}
                estado={estado}
                onCaraClick={onCara}
                className="h-[110px] w-[88px]"
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[11px] text-muted-foreground">
                Elegí la marca y tocá la cara del dibujo. Repetir el clic la
                quita.
              </span>
              <div className="flex flex-wrap gap-1">
                {CODIGOS_CARA.map((codigo) =>
                  chip({
                    key: codigo,
                    activo:
                      herramientaCara.tipo === "marca" &&
                      herramientaCara.codigo === codigo,
                    simbolo: CODIGO_INFO[codigo].simbolo,
                    label: CODIGO_INFO[codigo].label,
                    colorSimbolo: color,
                    onClick: () =>
                      onHerramientaCaraChange({ tipo: "marca", codigo }),
                  }),
                )}
                {chip({
                  key: "borrar",
                  activo: herramientaCara.tipo === "borrar",
                  simbolo: <Eraser className="size-3" />,
                  label: "Borrar",
                  onClick: () => onHerramientaCaraChange({ tipo: "borrar" }),
                })}
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Pieza completa
          </legend>
          <div className="flex flex-wrap gap-1">
            {CODIGOS_PIEZA.map((codigo) => {
              const puesta = marcasPieza.find((m) => m.codigo === codigo);
              return chip({
                key: codigo,
                activo: Boolean(puesta),
                simbolo: CODIGO_INFO[codigo].simbolo,
                label: CODIGO_INFO[codigo].label,
                // Puesta: muestra su propio color; si no, el que se va a aplicar.
                colorSimbolo: COLOR_TIPO[puesta?.tipo ?? tipoMarca],
                onClick: () => onPieza(codigo),
              });
            })}
          </div>
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}
