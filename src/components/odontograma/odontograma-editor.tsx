"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  borrarCara,
  borrarPieza,
  contarDientesExistentes,
  describirItem,
  esCodigoDeCara,
  marcarRealizada,
  planDeTratamiento,
  toggleMarcaCara,
  toggleMarcaPieza,
  type Cara,
  type DatosOdontograma,
  type TipoMarca,
} from "@/lib/odontograma";
import { COLOR_TIPO } from "./diente-svg";
import { OdontogramaGrid } from "./odontograma-grid";
import { OdontogramaToolbar, type Herramienta } from "./odontograma-toolbar";

type Props = {
  datos: DatosOdontograma;
  onChange: (datos: DatosOdontograma) => void;
  nota: string;
  onNotaChange: (nota: string) => void;
  // Piezas a resaltar (las que cambiaron respecto del snapshot anterior).
  resaltadas?: ReadonlySet<string>;
  notaId?: string;
};

export function OdontogramaEditor({ datos, onChange, nota, onNotaChange, resaltadas, notaId }: Props) {
  const [herramienta, setHerramienta] = useState<Herramienta>({ tipo: "marca", codigo: "CARIES" });
  const [tipoMarca, setTipoMarca] = useState<TipoMarca>("existente");

  const plan = planDeTratamiento(datos);
  const existentes = contarDientesExistentes(datos);

  function handleCara(pieza: number, cara: Cara) {
    const p = String(pieza);
    if (herramienta.tipo === "borrar") return onChange(borrarCara(datos, p, cara));
    const { codigo } = herramienta;
    // Una marca de pieza completa se aplica con clic en cualquier cara.
    onChange(
      esCodigoDeCara(codigo)
        ? toggleMarcaCara(datos, p, cara, { codigo, tipo: tipoMarca })
        : toggleMarcaPieza(datos, p, { codigo, tipo: tipoMarca })
    );
  }

  function handlePieza(pieza: number) {
    const p = String(pieza);
    if (herramienta.tipo === "borrar") return onChange(borrarPieza(datos, p));
    const { codigo } = herramienta;
    // Con una marca de cara, el número aplica la marca a la oclusal.
    onChange(
      esCodigoDeCara(codigo)
        ? toggleMarcaCara(datos, p, "O", { codigo, tipo: tipoMarca })
        : toggleMarcaPieza(datos, p, { codigo, tipo: tipoMarca })
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OdontogramaToolbar
        herramienta={herramienta}
        onHerramientaChange={setHerramienta}
        tipoMarca={tipoMarca}
        onTipoMarcaChange={setTipoMarca}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 rounded-xl border border-border bg-card/50 p-3 sm:p-4">
          <OdontogramaGrid
            datos={datos}
            onCaraClick={handleCara}
            onPiezaClick={handlePieza}
            resaltadas={resaltadas}
          />
          <Leyenda mostrarCambios={Boolean(resaltadas && resaltadas.size > 0)} />
        </div>

        <aside className="flex flex-col gap-5">
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
                    className="flex items-center gap-2 px-3 py-2 text-xs"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: COLOR_TIPO.requerida }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">{describirItem(item)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      title="Marcar como realizada"
                      aria-label={`Marcar como realizada: ${describirItem(item)}`}
                      onClick={() => onChange(marcarRealizada(datos, item))}
                    >
                      <Check />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <span className="text-sm">Dientes existentes</span>
            <span className="text-sm font-semibold tabular-nums">
              {existentes}
              <span className="font-normal text-muted-foreground"> / 32</span>
            </span>
          </section>

          <section className="flex flex-col gap-2">
            <Label htmlFor={notaId}>Observaciones</Label>
            <Textarea
              id={notaId}
              value={nota}
              onChange={(e) => onNotaChange(e.target.value)}
              placeholder="Notas de esta visita, indicaciones, color…"
              rows={4}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function Leyenda({ mostrarCambios }: { mostrarCambios: boolean }) {
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
