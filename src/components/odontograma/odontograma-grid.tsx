"use client";

import { cn } from "@/lib/utils";
import { ARCADAS, type Cara, type DatosOdontograma } from "@/lib/odontograma";
import { DienteSvg } from "./diente-svg";

type Props = {
  datos: DatosOdontograma;
  // Modo pincel: cada cara aplica la marca directo y el número, a la pieza.
  onCaraClick?: (pieza: number, cara: Cara) => void;
  onPiezaClick?: (pieza: number) => void;
  // Modo selección: toda la pieza es un botón (abre el popover de edición).
  onDienteClick?: (pieza: number, elemento: HTMLElement) => void;
  seleccionada?: number | null;
  resaltadas?: ReadonlySet<string>;
};

// Mismo layout que la ficha en papel: permanentes arriba, temporales debajo,
// cada dentición con la cruz que separa los cuatro cuadrantes.
export function OdontogramaGrid(props: Props) {
  return (
    <>
      <p className="mb-1 text-center text-[11px] text-muted-foreground sm:hidden">
        Deslizá hacia los costados para ver todas las piezas.
      </p>
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="mx-auto flex w-max flex-col items-center gap-5 py-1">
          <Denticion titulo="Permanente" arcada={ARCADAS.permanente} {...props} />
          <Denticion titulo="Temporal" arcada={ARCADAS.temporal} {...props} />
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
        <Hemiarcada piezas={arcada.inferior[1]} className="pt-1.5 pl-1.5" {...rest} />
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
  onDienteClick,
  seleccionada,
  resaltadas,
}: {
  piezas: readonly number[];
  superior?: boolean;
  className?: string;
} & Props) {
  return (
    <div className={cn("flex gap-0.5 border-foreground/60", className)}>
      {piezas.map((numero) => {
        const estado = datos.piezas[String(numero)];
        const resaltada = resaltadas?.has(String(numero));

        if (onDienteClick) {
          const activa = seleccionada === numero;
          return (
            <button
              key={numero}
              type="button"
              onClick={(e) => onDienteClick(numero, e.currentTarget)}
              aria-label={`Editar pieza ${numero}`}
              aria-expanded={activa}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
                activa && "bg-primary/10 ring-2 ring-primary"
              )}
            >
              {superior && <Numero numero={numero} />}
              <DienteSvg numero={numero} estado={estado} resaltada={resaltada} />
              {!superior && <Numero numero={numero} />}
            </button>
          );
        }

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
          <Numero numero={numero} />
        );
        return (
          <div key={numero} className="flex flex-col items-center gap-0.5">
            {superior && label}
            <DienteSvg
              numero={numero}
              estado={estado}
              resaltada={resaltada}
              onCaraClick={onCaraClick ? (cara) => onCaraClick(numero, cara) : undefined}
            />
            {!superior && label}
          </div>
        );
      })}
    </div>
  );
}

function Numero({ numero }: { numero: number }) {
  return (
    <span className="px-1 text-[11px] leading-4 font-medium text-muted-foreground tabular-nums">
      {numero}
    </span>
  );
}
