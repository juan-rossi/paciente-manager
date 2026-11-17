"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CARA_LABELS, type Cara } from "@/lib/odontograma";
import type { PracticaVisita } from "@/lib/practica-odontologica";
import { formatFechaCorta, odontogramaFromApi } from "./utils";
import type { OdontogramaValue } from "./types";

type Fila = PracticaVisita & { fecha: string; visita: string; orden: number };

function describirCaras(caras: Cara[]) {
  return caras.map((c) => CARA_LABELS[c]).join(", ");
}

// Aplana las prácticas de todas las visitas, de la más reciente a la más vieja.
// Se numeran las visitas igual que en la pestaña Odontograma (inicial primero).
function aFilas(odontogramas: OdontogramaValue[]): Fila[] {
  const ordenados = [...odontogramas].sort((a, b) =>
    a.tipo !== b.tipo ? (a.tipo === "INICIAL" ? -1 : 1) : a.fecha.localeCompare(b.fecha)
  );
  let nro = 0;
  const filas = ordenados.flatMap((o, i) => {
    const visita = o.tipo === "INICIAL" ? "Inicial" : `Visita ${++nro}`;
    return (o.practicas ?? []).map((p) => ({ ...p, fecha: o.fecha, visita, orden: i }));
  });
  // sort es estable: dentro de una visita queda el orden de carga.
  return filas.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.orden - a.orden);
}

// Se monta cada vez que se abre la pestaña (TabsContent desmonta las
// inactivas), así que siempre refleja lo cargado en la pestaña Odontograma.
export function HistorialPracticasTab({ patientId }: { patientId: string }) {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [error, setError] = useState(false);
  // Se incrementa para reintentar la carga.
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/patients/${patientId}/odontogramas`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (!cancelado) setFilas(aFilas((data.odontogramas ?? []).map(odontogramaFromApi)));
      })
      .catch(() => {
        if (!cancelado) setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [patientId, intento]);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-semibold">Historial de prácticas realizadas</h3>
          {filas && filas.length > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{filas.length}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Todas las prácticas del nomenclador cargadas en las visitas, de la más reciente a la más antigua.
        </p>
      </header>

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No se pudo cargar el historial.
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setError(false);
              setFilas(null);
              setIntento((n) => n + 1);
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : !filas ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando prácticas...
        </div>
      ) : filas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
          Todavía no hay prácticas cargadas. Se agregan desde cada visita en la pestaña Odontograma.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Práctica</th>
                <th className="px-3 py-2 font-medium">Pieza</th>
                <th className="px-3 py-2 font-medium">Caras</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 align-top whitespace-nowrap">
                    <div className="tabular-nums">{formatFechaCorta(p.fecha)}</div>
                    <div className="text-xs text-muted-foreground">{p.visita}</div>
                  </td>
                  <td className="px-3 py-2 align-top font-mono text-xs whitespace-nowrap tabular-nums">
                    {p.codigo}
                  </td>
                  <td className="px-3 py-2 align-top">{p.descripcion}</td>
                  <td className="px-3 py-2 align-top whitespace-nowrap tabular-nums">
                    {p.pieza ?? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Boca completa
                      </span>
                    )}
                  </td>
                  <td
                    className="px-3 py-2 align-top font-mono text-xs whitespace-nowrap"
                    title={p.caras.length > 0 ? describirCaras(p.caras) : undefined}
                  >
                    {p.caras.length > 0 ? p.caras.join(" ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
