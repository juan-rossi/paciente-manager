"use client";

import { useMemo } from "react";
import { cambiosEntre, diffOdontograma, type DatosOdontograma } from "@/lib/odontograma";
import { OdontogramaGrid } from "./odontograma-grid";
import { CambiosVisita, DientesExistentes, Leyenda, PlanTratamiento } from "./panel-odontograma";

type Props = {
  datos: DatosOdontograma;
  nota: string;
  // Snapshot anterior para resaltar y listar lo que cambió en esta visita.
  anterior?: { datos: DatosOdontograma; fecha: string } | null;
};

// Vista de solo lectura: lo que se ve al abrir la ficha, sin controles de edición.
export function OdontogramaVista({ datos, nota, anterior }: Props) {
  const resaltadas = useMemo(
    () => (anterior ? diffOdontograma(anterior.datos, datos) : undefined),
    [anterior, datos]
  );
  const cambios = useMemo(
    () => (anterior ? cambiosEntre(anterior.datos, datos) : null),
    [anterior, datos]
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 rounded-xl border border-border bg-card/50 p-3 sm:p-4">
        <OdontogramaGrid datos={datos} resaltadas={resaltadas} />
        <Leyenda mostrarCambios={Boolean(resaltadas && resaltadas.size > 0)} />
      </div>

      <aside className="flex flex-col gap-5">
        {cambios && anterior && <CambiosVisita cambios={cambios} desde={anterior.fecha} />}
        <PlanTratamiento datos={datos} />
        <DientesExistentes datos={datos} />
        {nota.trim() && (
          <section className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold">Observaciones</h4>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{nota}</p>
          </section>
        )}
      </aside>
    </div>
  );
}
