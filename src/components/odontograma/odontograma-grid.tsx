"use client";

import { cn } from "@/lib/utils";
import { ARCADAS, type Cara, type DatosOdontograma } from "@/lib/odontograma";
import { DienteSvg } from "./diente-svg";

type Props = {
  datos: DatosOdontograma;
  onCaraClick?: (pieza: number, cara: Cara) => void;
  onPiezaClick?: (pieza: number) => void;
  resaltadas?: ReadonlySet<string>;
};

// Mismo layout que la ficha en papel: permanentes arriba, temporales debajo,
// cada dentición con la cruz que separa los cuatro cuadrantes.
export function OdontogramaGrid({
  datos,
  onCaraClick,
  onPiezaClick,
  resaltadas,
}: Props) {
  return (
    <>
      <p className="mb-1 text-center text-[11px] text-muted-foreground sm:hidden">
        Deslizá hacia los costados para ver todas las piezas.
      </p>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="mx-auto flex w-max flex-col items-center gap-6 py-2">
          <Denticion
            titulo="Permanente"
            arcada={ARCADAS.permanente}
            datos={datos}
            onCaraClick={onCaraClick}
            onPiezaClick={onPiezaClick}
            resaltadas={resaltadas}
          />
          <Denticion
            titulo="Temporal"
            arcada={ARCADAS.temporal}
            datos={datos}
            onCaraClick={onCaraClick}
            onPiezaClick={onPiezaClick}
            resaltadas={resaltadas}
          />
        </div>
      </div>
    </>
  );
}

type Arcada = {
  superior: readonly (readonly number[])[];
  inferior: readonly (readonly number[])[];
};

function Denticion({
  titulo,
  arcada,
  ...rest
}: { titulo: string; arcada: Arcada } & Props) {
  return (
    <section
      className="flex flex-col items-center gap-1.5"
      aria-label={`Dentición ${titulo.toLowerCase()}`}
    >
      <h4 className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {titulo}
      </h4>
      <div className="grid grid-cols-[auto_auto]">
        <Hemiarcada
          piezas={arcada.superior[0]}
          superior
          className="border-r-2 border-b-2 pr-1.5 pb-1.5"
          {...rest}
        />
        <Hemiarcada
          piezas={arcada.superior[1]}
          superior
          className="border-b-2 pb-1.5 pl-1.5"
          {...rest}
        />
        <Hemiarcada
          piezas={arcada.inferior[0]}
          className="border-r-2 pt-1.5 pr-1.5"
          {...rest}
        />
        <Hemiarcada
          piezas={arcada.inferior[1]}
          className="pt-1.5 pl-1.5"
          {...rest}
        />
      </div>
    </section>
  );
}

function Hemiarcada({
  piezas,
  superior = false,
  className,
  datos,
  onCaraClick,
  onPiezaClick,
  resaltadas,
}: {
  piezas: readonly number[];
  superior?: boolean;
  className?: string;
} & Props) {
  return (
    <div className={cn("flex gap-0.5 border-foreground/60", className)}>
      {piezas.map((numero) => {
        const label = onPiezaClick ? (
          <button
            type="button"
            onClick={() => onPiezaClick(numero)}
            className="rounded px-1 text-[11px] leading-4 font-medium text-muted-foreground tabular-nums outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Pieza ${numero} completa`}
            title={`Pieza ${numero} completa`}
          >
            {numero}
          </button>
        ) : (
          <span className="px-1 text-[11px] leading-4 font-medium text-muted-foreground tabular-nums">
            {numero}
          </span>
        );
        return (
          <div key={numero} className="flex flex-col items-center gap-0.5">
            {superior && label}
            <DienteSvg
              numero={numero}
              estado={datos.piezas[String(numero)]}
              resaltada={resaltadas?.has(String(numero))}
              onCaraClick={
                onCaraClick ? (cara) => onCaraClick(numero, cara) : undefined
              }
            />
            {!superior && label}
          </div>
        );
      })}
    </div>
  );
}
