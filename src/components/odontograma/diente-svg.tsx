"use client";

import { useId, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import {
  CARA_LABELS,
  CODIGO_INFO,
  esSuperior,
  mesialALaDerecha,
  type Cara,
  type EstadoPieza,
  type TipoMarca,
} from "@/lib/odontograma";

// Convención de la ficha en papel: rojo = prestación existente, azul =
// prestación requerida.
export const COLOR_TIPO: Record<TipoMarca, string> = {
  existente: "#dc2626",
  requerida: "#2563eb",
};

// Geometría (viewBox 40x50): pieza de 4..36, cara central de 14..26 y una
// franja de 38..49 debajo para las abreviaturas (TC, IM, P, ...).
type Posicion = "arriba" | "abajo" | "izquierda" | "derecha" | "centro";

const POLIGONOS: Record<Exclude<Posicion, "centro">, string> = {
  arriba: "4,4 36,4 26,14 14,14",
  abajo: "4,36 36,36 26,26 14,26",
  izquierda: "4,4 14,14 14,26 4,36",
  derecha: "36,4 26,14 26,26 36,36",
};

// Qué cara anatómica cae en cada posición del dibujo, según la pieza:
// en el maxilar superior vestibular queda arriba; en el inferior, abajo.
// Mesial apunta siempre hacia la línea media.
function carasPorPosicion(numero: number): Record<Posicion, Cara> {
  const superior = esSuperior(numero);
  const mesialDerecha = mesialALaDerecha(numero);
  return {
    arriba: superior ? "V" : "L",
    abajo: superior ? "L" : "V",
    izquierda: mesialDerecha ? "D" : "M",
    derecha: mesialDerecha ? "M" : "D",
    centro: "O",
  };
}

type Props = {
  numero: number;
  estado?: EstadoPieza;
  onCaraClick?: (cara: Cara) => void;
  resaltada?: boolean;
  className?: string;
};

export function DienteSvg({ numero, estado, onCaraClick, resaltada, className }: Props) {
  const patternId = useId();
  const caras = carasPorPosicion(numero);
  const interactivo = Boolean(onCaraClick);
  const marcasPieza = estado?.pieza ?? [];
  const marca = (codigo: string) => marcasPieza.find((m) => m.codigo === codigo);
  const ausente = marca("AUSENTE");
  const extraccion = marca("EXTRACCION");
  const corona = marca("CORONA");
  const puente = marca("PUENTE");
  const ortodoncia = marca("ORTODONCIA");
  const incurable = marca("CARIES_INCURABLE");
  const abreviaturas = marcasPieza.filter((m) => CODIGO_INFO[m.codigo].abrev);

  function relleno(cara: Cara) {
    const m = estado?.caras?.[cara];
    if (!m) return undefined;
    // Caries: rayado (lesión); obturaciones/incrustación: color sólido.
    return m.codigo === "CARIES" ? `url(#${patternId}-${m.tipo})` : COLOR_TIPO[m.tipo];
  }

  function tituloCara(cara: Cara) {
    const m = estado?.caras?.[cara];
    const base = `Pieza ${numero}, cara ${CARA_LABELS[cara]}`;
    return m ? `${base}: ${CODIGO_INFO[m.codigo].label} (${m.tipo})` : base;
  }

  function handleKey(event: KeyboardEvent, cara: Cara) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCaraClick?.(cara);
    }
  }

  const caraProps = (cara: Cara) => ({
    className: cn(
      "stroke-foreground/70 transition-colors",
      !relleno(cara) && "fill-background",
      interactivo &&
        "cursor-pointer outline-none hover:opacity-75 focus-visible:stroke-ring focus-visible:[stroke-width:2]",
      interactivo && !relleno(cara) && "hover:fill-muted"
    ),
    style: relleno(cara) ? { fill: relleno(cara) } : undefined,
    strokeWidth: 1,
    ...(interactivo
      ? {
          role: "button",
          tabIndex: 0,
          "aria-label": tituloCara(cara),
          onClick: () => onCaraClick?.(cara),
          onKeyDown: (e: KeyboardEvent) => handleKey(e, cara),
        }
      : {}),
  });

  return (
    <svg
      viewBox="0 0 40 50"
      className={cn("h-[55px] w-11 shrink-0 select-none", className)}
      aria-label={interactivo ? undefined : `Pieza ${numero}`}
    >
      <defs>
        {(["existente", "requerida"] as const).map((tipo) => (
          <pattern
            key={tipo}
            id={`${patternId}-${tipo}`}
            width="4"
            height="4"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="4" height="4" className="fill-background" />
            <line x1="0" y1="0" x2="0" y2="4" stroke={COLOR_TIPO[tipo]} strokeWidth="2.5" />
          </pattern>
        ))}
      </defs>

      {resaltada && (
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="3"
          fill="none"
          className="stroke-amber-500"
          strokeWidth="2"
          strokeDasharray="3 2"
        />
      )}

      {(["arriba", "abajo", "izquierda", "derecha"] as const).map((pos) => (
        <polygon key={pos} points={POLIGONOS[pos]} {...caraProps(caras[pos])}>
          <title>{tituloCara(caras[pos])}</title>
        </polygon>
      ))}
      <rect x="14" y="14" width="12" height="12" {...caraProps("O")}>
        <title>{tituloCara("O")}</title>
      </rect>

      {/* Marcas de pieza completa: van encima y no capturan clics. */}
      <g pointerEvents="none" fill="none" strokeLinecap="round">
        {incurable && (
          <rect x="15.5" y="15.5" width="9" height="9" fill={COLOR_TIPO[incurable.tipo]} />
        )}
        {corona && (
          <circle cx="20" cy="20" r="18.5" stroke={COLOR_TIPO[corona.tipo]} strokeWidth="2" />
        )}
        {ausente && (
          <path d="M3 3 L37 37 M37 3 L3 37" stroke={COLOR_TIPO[ausente.tipo]} strokeWidth="3" />
        )}
        {extraccion && (
          <path d="M1 16.5 H39 M1 23.5 H39" stroke={COLOR_TIPO[extraccion.tipo]} strokeWidth="3" />
        )}
        {puente && (
          <path d="M0.5 7 V1 H39.5 V7" stroke={COLOR_TIPO[puente.tipo]} strokeWidth="2" />
        )}
        {ortodoncia && (
          <path
            d="M5 41 L10 38 L15 41 L20 38 L25 41 L30 38 L35 41"
            stroke={COLOR_TIPO[ortodoncia.tipo]}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        )}
      </g>

      {abreviaturas.length > 0 && (
        <text
          x="20"
          y="49"
          textAnchor="middle"
          fontSize={abreviaturas.length > 2 ? 6.5 : 8}
          fontWeight="700"
          pointerEvents="none"
        >
          {abreviaturas.map((m, i) => (
            <tspan key={m.codigo} fill={COLOR_TIPO[m.tipo]}>
              {i > 0 ? " " : ""}
              {CODIGO_INFO[m.codigo].abrev}
            </tspan>
          ))}
        </text>
      )}
    </svg>
  );
}
