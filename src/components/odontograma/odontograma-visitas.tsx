"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { History, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSection } from "@/components/patient-form/fields";
import { formatFechaCorta } from "@/components/patient-form/utils";
import { formatDateParamBA } from "@/lib/timezone";
import {
  aplicarPracticas,
  datosVacios,
  parseDatos,
  type Cara,
  type DatosOdontograma,
  type OdontogramaTipo,
} from "@/lib/odontograma";
import type {
  PracticaCatalogo,
  PracticaVisita,
} from "@/lib/practica-odontologica";
import { PracticaPickerDialog } from "./practica-picker-dialog";

export type VisitaHistorial = {
  id: string;
  tipo: OdontogramaTipo;
  // YYYY-MM-DD
  fecha: string;
  nota: string;
  datos: DatosOdontograma;
  practicas: PracticaVisita[];
};

// Visita a la que se le cargan prácticas desde la ficha.
type VisitaDestino = {
  id: string;
  tipo: OdontogramaTipo;
  fecha: string;
  datos: DatosOdontograma;
};

// Con más visitas que esto, se muestran las últimas y un botón para ver todas.
const VISIBLES = 5;

// Tarjeta del detalle de paciente (solo odontólogos), debajo del odontograma:
// las visitas en las que se realizó al menos una práctica, de la más reciente a
// la más vieja. Las visitas sin prácticas no se muestran. La tarjeta se ve
// siempre, aunque no haya ninguna, para poder cargar prácticas sin abrir el
// odontograma: van a la visita de hoy, y si no hay se ofrece crearla.
export function OdontogramaVisitas({
  patientId,
  visitas: todas,
}: {
  patientId: string;
  // De la más reciente a la más vieja (la primera es la última del odontograma).
  visitas: VisitaHistorial[];
}) {
  const router = useRouter();
  const [verTodas, setVerTodas] = useState(false);
  const [destino, setDestino] = useState<VisitaDestino | null>(null);
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [confirmarVisita, setConfirmarVisita] = useState(false);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visitas = todas.filter((v) => v.practicas.length > 0);
  const mostradas = verTodas ? visitas : visitas.slice(0, VISIBLES);
  const ocultas = visitas.length - mostradas.length;

  // Para el modal: el estado de la visita destino con lo ya cargado en ella
  // (sale de las props, que se refrescan con cada práctica agregada).
  const practicasDestino =
    (destino && todas.find((v) => v.id === destino.id)?.practicas) || [];
  const datosPicker = destino
    ? aplicarPracticas(destino.datos, practicasDestino)
    : null;

  function agregarPractica() {
    setError(null);
    const hoy = formatDateParamBA(new Date());
    const deHoy = todas.find((v) => v.fecha === hoy);
    if (deHoy) {
      setDestino(deHoy);
      setPickerAbierto(true);
    } else {
      setConfirmarVisita(true);
    }
  }

  async function crearVisitaDeHoy() {
    setCreando(true);
    setError(null);
    // Igual que "Registrar visita" en el odontograma: arranca con el estado en
    // que quedó la última (lo hecho en ella queda como realizada). Sin ninguna
    // visita, esta es la inicial.
    const ultima = todas[0];
    try {
      const res = await fetch(`/api/patients/${patientId}/odontogramas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: ultima ? "CONTROL" : "INICIAL",
          fecha: formatDateParamBA(new Date()),
          nota: "",
          datos: ultima
            ? aplicarPracticas(ultima.datos, ultima.practicas)
            : datosVacios(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo registrar la visita.");
        return;
      }
      const o = data.odontograma;
      setDestino({
        id: o.id,
        tipo: o.tipo,
        fecha: String(o.fecha).slice(0, 10),
        datos: parseDatos(o.datos),
      });
      setPickerAbierto(true);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCreando(false);
      setConfirmarVisita(false);
    }
  }

  async function agregar(
    practica: PracticaCatalogo,
    pieza: string | null,
    caras: Cara[],
  ): Promise<string | null> {
    if (!destino) return "No hay una visita seleccionada.";
    try {
      const res = await fetch(
        `/api/patients/${patientId}/odontogramas/${destino.id}/practicas`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ practicaId: practica.id, pieza, caras }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return data.error ?? "No se pudo agregar la práctica.";
      // El modal queda abierto para cargar varias seguidas; la ficha se
      // actualiza por detrás.
      router.refresh();
      return null;
    } catch {
      return "No se pudo conectar con el servidor.";
    }
  }

  return (
    <FormSection
      title="Historial de prácticas realizadas"
      icon={History}
      contentClassName="bg-card sm:grid-cols-1 lg:grid-cols-1"
      headerExtra={
        <span className="flex items-center gap-3">
          {visitas.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground tabular-nums">
              {visitas.length} {visitas.length === 1 ? "visita" : "visitas"}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={agregarPractica}
            disabled={creando}
          >
            <Plus className="size-3.5" />
            Agregar práctica
          </Button>
        </span>
      }
    >
      {error && <p className="text-sm text-destructive">{error}</p>}

      {visitas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
          Todavía no se registró ninguna práctica. Usá &ldquo;Agregar
          práctica&rdquo; para cargar las que se realicen hoy: quedan asociadas
          a la visita del día.
        </p>
      ) : (
        <ol className="flex flex-col">
          {mostradas.map((v, i) => {
            const ultima = i === mostradas.length - 1;
            const nota = v.nota.trim();
            return (
              <li
                key={v.id}
                className={cn("relative pl-7", !ultima && "pb-5")}
              >
                {/* Línea que une los nodos. */}
                {!ultima && (
                  <span
                    aria-hidden
                    className="absolute top-4 bottom-0 left-[6px] w-0.5 bg-border"
                  />
                )}
                <span
                  aria-hidden
                  className="absolute top-[3px] left-0 size-3.5 rounded-full border-2 border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatFechaCorta(v.fecha)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      v.tipo === "INICIAL"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {v.tipo === "INICIAL" ? "Inicial" : "Control"}
                  </span>
                </div>

                {nota && (
                  <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                    {nota}
                  </p>
                )}

                <ul className="mt-2 flex flex-col divide-y divide-border rounded-lg border border-border bg-muted/30">
                  {v.practicas.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-baseline gap-2 px-3 py-2 text-xs"
                    >
                      <span className="shrink-0 rounded bg-muted px-1 font-mono text-[11px] text-muted-foreground tabular-nums">
                        {p.codigo}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold tabular-nums">
                          {p.pieza ?? "Boca completa"} ·{" "}
                        </span>
                        {p.descripcion}
                        {p.caras.length > 0 && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({p.caras.join(" ")})
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      )}

      {visitas.length > VISIBLES && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVerTodas((v) => !v)}
          >
            {verTodas ? "Ver menos" : `Ver las ${ocultas} anteriores`}
          </Button>
        </div>
      )}

      {destino && datosPicker && (
        <PracticaPickerDialog
          open={pickerAbierto}
          onOpenChange={setPickerAbierto}
          subtitulo={`${destino.tipo === "INICIAL" ? "Visita inicial" : "Visita"} · ${formatFechaCorta(destino.fecha)}`}
          datos={datosPicker}
          onAgregar={agregar}
        />
      )}

      <Dialog
        open={confirmarVisita}
        onOpenChange={(o) => !o && !creando && setConfirmarVisita(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No hay una visita registrada hoy</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <DialogDescription>
              Las prácticas se cargan dentro de una visita.{" "}
              {todas.length > 0
                ? "¿Querés crear una visita de control con fecha de hoy?"
                : "El paciente todavía no tiene visitas. ¿Querés crear la visita inicial con fecha de hoy?"}
            </DialogDescription>
            <p className="text-xs text-muted-foreground">
              {todas.length > 0
                ? "Arranca con el odontograma tal como quedó en la última visita."
                : "Su odontograma lo podés completar después."}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmarVisita(false)}
              disabled={creando}
            >
              Cancelar
            </Button>
            <Button onClick={crearVisitaDeHoy} disabled={creando}>
              {creando && <Loader2 className="size-4 animate-spin" />}
              Crear visita de hoy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FormSection>
  );
}
