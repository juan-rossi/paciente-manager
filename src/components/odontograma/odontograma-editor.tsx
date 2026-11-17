"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  borrarCara,
  borrarPieza,
  esCodigoDeCara,
  marcarRealizada,
  toggleMarcaCara,
  toggleMarcaPieza,
  type Cara,
  type CodigoPieza,
  type DatosOdontograma,
  type TipoMarca,
} from "@/lib/odontograma";
import { OdontogramaGrid } from "./odontograma-grid";
import { DientesExistentes, Leyenda, PlanTratamiento } from "./panel-odontograma";
import { PiezaPopover, type Herramienta } from "./pieza-popover";

type Props = {
  datos: DatosOdontograma;
  onChange: (datos: DatosOdontograma) => void;
  nota: string;
  onNotaChange: (nota: string) => void;
  // Piezas a resaltar (las que cambiaron respecto del snapshot anterior).
  resaltadas?: ReadonlySet<string>;
  notaId?: string;
};

// Edición: clic en una pieza abre un popover con la pieza en grande y las marcas.
export function OdontogramaEditor({ datos, onChange, nota, onNotaChange, resaltadas, notaId }: Props) {
  const [tipoMarca, setTipoMarca] = useState<TipoMarca>("existente");
  const [herramientaCara, setHerramientaCara] = useState<Herramienta>({ tipo: "marca", codigo: "CARIES" });
  const [abierta, setAbierta] = useState<{ numero: number; anchor: HTMLElement } | null>(null);

  function aplicarCara(pieza: number, cara: Cara, h: Herramienta, tipo: TipoMarca) {
    const p = String(pieza);
    if (h.tipo === "borrar") return onChange(borrarCara(datos, p, cara));
    const { codigo } = h;
    // Una marca de pieza completa se aplica con clic en cualquier cara.
    onChange(
      esCodigoDeCara(codigo)
        ? toggleMarcaCara(datos, p, cara, { codigo, tipo })
        : toggleMarcaPieza(datos, p, { codigo, tipo })
    );
  }

  function aplicarPieza(pieza: number, h: Herramienta, tipo: TipoMarca) {
    const p = String(pieza);
    if (h.tipo === "borrar") return onChange(borrarPieza(datos, p));
    const { codigo } = h;
    // Con una marca de cara, el número aplica la marca a la oclusal.
    onChange(
      esCodigoDeCara(codigo)
        ? toggleMarcaCara(datos, p, "O", { codigo, tipo })
        : toggleMarcaPieza(datos, p, { codigo, tipo })
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-xs text-muted-foreground">Hacé clic en una pieza para marcarla.</p>
        <div className="rounded-xl border border-border bg-card/50 p-3 sm:p-4">
          <OdontogramaGrid
            datos={datos}
            onDienteClick={(numero, anchor) => setAbierta({ numero, anchor })}
            seleccionada={abierta?.numero ?? null}
            resaltadas={resaltadas}
          />
          <Leyenda mostrarCambios={Boolean(resaltadas && resaltadas.size > 0)} />
        </div>
      </div>

      <aside className="flex flex-col gap-5">
        <PlanTratamiento datos={datos} onRealizada={(item) => onChange(marcarRealizada(datos, item))} />
        <DientesExistentes datos={datos} />
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

      <PiezaPopover
        numero={abierta?.numero ?? null}
        anchor={abierta?.anchor ?? null}
        onClose={() => setAbierta(null)}
        estado={abierta ? datos.piezas[String(abierta.numero)] : undefined}
        tipoMarca={tipoMarca}
        onTipoMarcaChange={setTipoMarca}
        herramientaCara={herramientaCara}
        onHerramientaCaraChange={setHerramientaCara}
        onCara={(cara) => {
          if (!abierta) return;
          aplicarCara(abierta.numero, cara, herramientaCara, tipoMarca);
        }}
        onPieza={(codigo: CodigoPieza) => {
          if (!abierta) return;
          aplicarPieza(abierta.numero, { tipo: "marca", codigo }, tipoMarca);
        }}
        onLimpiar={() => abierta && onChange(borrarPieza(datos, String(abierta.numero)))}
      />
    </div>
  );
}
