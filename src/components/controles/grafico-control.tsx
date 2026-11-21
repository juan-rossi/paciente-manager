"use client";

import { useEffect, useRef, useState } from "react";
import { formatFechaCorta } from "@/components/patient-form/utils";

export type PuntoControl = { fecha: string; valores: readonly (number | null)[] };

type Props = {
  puntos: readonly PuntoControl[];
  // Nombre de cada serie (la presión tiene dos: máxima y mínima).
  series: readonly string[];
  formatear: (serie: number, valor: number) => string;
  unidad: string;
  titulo: string;
  // Escala fija (EVA, ECOG): el eje va de punta a punta en vez de ajustarse
  // a los valores medidos.
  dominio?: { min: number; max: number };
};

const ALTO = 128;
const PAD = { izq: 40, der: 10, arriba: 10, abajo: 22 };

function diaMs(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

// Fecha corta del eje: "3/10/26".
function fechaEje(fecha: string): string {
  const [y, m, d] = fecha.split("-");
  return `${Number(d)}/${Number(m)}/${y.slice(2)}`;
}

// Línea de un indicador a lo largo del tiempo. Un solo tono (--primary); con
// dos series, la segunda va punteada y la leyenda la nombra (la identidad no
// depende solo del color). Al pasar el mouse marca el control más cercano y
// muestra sus valores; la tabla de controles es la vista accesible.
export function GraficoControl({ puntos, series, formatear, unidad, titulo, dominio }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [activo, setActivo] = useState<number | null>(null);

  useEffect(() => {
    const el = contenedorRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setAncho(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const valores = puntos.flatMap((p) => p.valores.filter((v): v is number => v != null));
  if (valores.length === 0) return null;

  let min = dominio ? dominio.min : Math.min(...valores);
  let max = dominio ? dominio.max : Math.max(...valores);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  // Con escala fija, un margen chico para que los puntos en 0 o en el máximo
  // no queden cortados contra el borde.
  const margen = (max - min) * (dominio ? 0.06 : 0.12);
  const yMin = min - margen;
  const yMax = max + margen;

  const t0 = diaMs(puntos[0].fecha);
  const t1 = diaMs(puntos[puntos.length - 1].fecha);
  const anchoUtil = Math.max(ancho - PAD.izq - PAD.der, 1);
  const altoUtil = ALTO - PAD.arriba - PAD.abajo;
  // El eje es de tiempo, salvo que haya dos controles el mismo día: ahí los
  // puntos se reparten parejo (si no, caen uno encima del otro y la línea
  // queda vertical).
  const fechasRepetidas = new Set(puntos.map((p) => p.fecha)).size < puntos.length;
  const x = (i: number) => {
    if (puntos.length === 1) return PAD.izq + anchoUtil / 2;
    if (fechasRepetidas) return PAD.izq + (i / (puntos.length - 1)) * anchoUtil;
    return PAD.izq + ((diaMs(puntos[i].fecha) - t0) / (t1 - t0)) * anchoUtil;
  };
  const y = (v: number) => PAD.arriba + (1 - (v - yMin) / (yMax - yMin)) * altoUtil;

  // Cada serie se corta donde un control no la tiene.
  const trazos = series.map((_, s) => {
    let d = "";
    let abierto = false;
    for (const [i, p] of puntos.entries()) {
      const v = p.valores[s];
      if (v == null) {
        abierto = false;
        continue;
      }
      d += `${abierto ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      abierto = true;
    }
    return d;
  });

  function alMover(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let mejor = 0;
    let distancia = Infinity;
    puntos.forEach((_, i) => {
      const dx = Math.abs(x(i) - px);
      if (dx < distancia) {
        distancia = dx;
        mejor = i;
      }
    });
    setActivo(mejor);
  }

  const puntoActivo = activo != null ? puntos[activo] : null;
  const xActivo = activo != null ? x(activo) : 0;

  return (
    <div ref={contenedorRef} className="relative w-full" style={{ height: ALTO }}>
      {ancho > 0 && (
        <svg
          width={ancho}
          height={ALTO}
          role="img"
          aria-label={`${titulo}: ${puntos.length} controles entre el ${formatFechaCorta(puntos[0].fecha)} y el ${formatFechaCorta(puntos[puntos.length - 1].fecha)}`}
          className="touch-none overflow-visible"
          onPointerMove={alMover}
          onPointerDown={alMover}
          onPointerLeave={() => setActivo(null)}
        >
          {/* Grilla recesiva: solo el mínimo y el máximo medidos. */}
          {[min, max].map((v) => (
            <g key={v}>
              <line
                x1={PAD.izq}
                x2={ancho - PAD.der}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--border)"
                strokeDasharray="2 3"
              />
              <text
                x={PAD.izq - 6}
                y={y(v)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {formatear(0, v)}
              </text>
            </g>
          ))}
          {/* Primera y última fecha; si son la misma, una sola, centrada. */}
          {puntos[0].fecha === puntos[puntos.length - 1].fecha ? (
            <text
              x={PAD.izq + anchoUtil / 2}
              y={ALTO - 6}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {fechaEje(puntos[0].fecha)}
            </text>
          ) : (
            <>
              <text x={PAD.izq} y={ALTO - 6} className="fill-muted-foreground text-[10px]">
                {fechaEje(puntos[0].fecha)}
              </text>
              <text x={ancho - PAD.der} y={ALTO - 6} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {fechaEje(puntos[puntos.length - 1].fecha)}
              </text>
            </>
          )}

          {puntoActivo && (
            <line
              x1={xActivo}
              x2={xActivo}
              y1={PAD.arriba}
              y2={ALTO - PAD.abajo}
              stroke="var(--muted-foreground)"
              strokeOpacity={0.4}
            />
          )}

          {trazos.map((d, s) => (
            <path
              key={s}
              d={d}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s === 1 ? "5 4" : undefined}
            />
          ))}
          {puntos.map((p, i) =>
            p.valores.map((v, s) =>
              v == null ? null : (
                <circle
                  key={`${i}-${s}`}
                  cx={x(i)}
                  cy={y(v)}
                  r={i === activo ? 5 : 4}
                  fill={s === 1 ? "var(--card)" : "var(--primary)"}
                  stroke={s === 1 ? "var(--primary)" : "var(--card)"}
                  strokeWidth={2}
                />
              )
            )
          )}
        </svg>
      )}

      {puntoActivo && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: Math.min(Math.max(xActivo, 70), Math.max(ancho - 70, 70)),
            transform: "translateX(-50%)",
          }}
        >
          <div className="text-muted-foreground">{formatFechaCorta(puntoActivo.fecha)}</div>
          {puntoActivo.valores.map((v, s) =>
            v == null ? null : (
              <div key={s} className="font-medium whitespace-nowrap tabular-nums text-foreground">
                {series.length > 1 && <span className="text-muted-foreground">{series[s]} </span>}
                {formatear(s, v)} {unidad}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
