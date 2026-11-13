"use client";

import { useId, useMemo, useState } from "react";
import { Loader2, Plus, Save, Smile, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDateParamBA } from "@/lib/timezone";
import { datosVacios, diffOdontograma } from "@/lib/odontograma";
import { OdontogramaEditor } from "@/components/odontograma/odontograma-editor";
import { DateInput } from "./date-input";
import { formatFechaCorta, odontogramaFromApi } from "./utils";
import type { OdontogramaValue } from "./types";

function hoy() {
  return formatDateParamBA(new Date());
}

export function odontogramaVacio(tipo: OdontogramaValue["tipo"] = "INICIAL"): OdontogramaValue {
  return { tipo, fecha: hoy(), nota: "", datos: datosVacios() };
}

function ordenar(lista: OdontogramaValue[]) {
  // El inicial siempre primero; el resto por fecha.
  return [...lista].sort((a, b) =>
    a.tipo !== b.tipo ? (a.tipo === "INICIAL" ? -1 : 1) : a.fecha.localeCompare(b.fecha)
  );
}

function mismoContenido(a: OdontogramaValue, b: OdontogramaValue) {
  return (
    a.tipo === b.tipo &&
    a.fecha === b.fecha &&
    a.nota.trim() === b.nota.trim() &&
    diffOdontograma(a.datos, b.datos).size === 0
  );
}

// ---------------------------------------------------------------------------
// Alta: solo el odontograma inicial, se guarda junto con el paciente.
// ---------------------------------------------------------------------------

type CreateProps = {
  value: OdontogramaValue;
  onChange: (value: OdontogramaValue) => void;
};

export function OdontogramaInicialTab({ value, onChange }: CreateProps) {
  const fechaId = useId();
  const notaId = useId();
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Odontograma inicial</h3>
          <p className="text-sm text-muted-foreground">
            Cómo llegó el paciente a la primera consulta. Se guarda junto con la ficha.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 sm:w-44">
          <Label htmlFor={fechaId}>Fecha</Label>
          <DateInput id={fechaId} value={value.fecha} onChange={(fecha) => onChange({ ...value, fecha })} />
        </div>
      </header>
      <OdontogramaEditor
        datos={value.datos}
        onChange={(datos) => onChange({ ...value, datos })}
        nota={value.nota}
        onNotaChange={(nota) => onChange({ ...value, nota })}
        notaId={notaId}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edición: línea de tiempo de visitas, cada una se guarda por su cuenta.
// ---------------------------------------------------------------------------

type EditProps = {
  patientId: string;
  initialOdontogramas: OdontogramaValue[];
};

const NUEVO = "__nuevo__";

export function OdontogramaHistorialTab({ patientId, initialOdontogramas }: EditProps) {
  const fechaId = useId();
  const notaId = useId();
  const [guardados, setGuardados] = useState(() => ordenar(initialOdontogramas));
  const [seleccion, setSeleccion] = useState<string | null>(
    () => guardados[guardados.length - 1]?.id ?? null
  );
  const [borrador, setBorrador] = useState<OdontogramaValue | null>(
    () => guardados[guardados.length - 1] ?? null
  );
  const [comparar, setComparar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Acción que quedó pendiente porque había cambios sin guardar.
  const [pendiente, setPendiente] = useState<(() => void) | null>(null);

  const original = seleccion === NUEVO ? null : guardados.find((o) => o.id === seleccion) ?? null;
  const sucio = borrador !== null && (original === null || !mismoContenido(borrador, original));

  // Snapshot anterior al seleccionado (para "comparar"): el último guardado
  // antes que él; para una visita nueva, el último guardado.
  const anterior = useMemo(() => {
    if (!borrador) return null;
    if (seleccion === NUEVO) return guardados[guardados.length - 1] ?? null;
    const idx = guardados.findIndex((o) => o.id === seleccion);
    return idx > 0 ? guardados[idx - 1] : null;
  }, [borrador, seleccion, guardados]);

  const resaltadas = useMemo(
    () => (comparar && anterior && borrador ? diffOdontograma(anterior.datos, borrador.datos) : undefined),
    [comparar, anterior, borrador]
  );

  function protegerCambios(accion: () => void) {
    if (sucio) setPendiente(() => accion);
    else accion();
  }

  function seleccionar(o: OdontogramaValue) {
    protegerCambios(() => {
      setSeleccion(o.id ?? null);
      setBorrador(o);
      setError(null);
    });
  }

  function registrarVisita() {
    protegerCambios(() => {
      const ultimo = guardados[guardados.length - 1];
      // Una visita nueva arranca con el estado en que quedó la anterior.
      setBorrador(
        ultimo
          ? { tipo: "CONTROL", fecha: hoy(), nota: "", datos: ultimo.datos }
          : odontogramaVacio("INICIAL")
      );
      setSeleccion(NUEVO);
      setComparar(Boolean(ultimo));
      setError(null);
    });
  }

  function descartar() {
    if (original) {
      setBorrador(original);
    } else {
      const ultimo = guardados[guardados.length - 1] ?? null;
      setBorrador(ultimo);
      setSeleccion(ultimo?.id ?? null);
    }
    setError(null);
  }

  async function guardar() {
    if (!borrador) return;
    setSaving(true);
    setError(null);
    try {
      const esNuevo = !borrador.id;
      const res = await fetch(
        esNuevo
          ? `/api/patients/${patientId}/odontogramas`
          : `/api/patients/${patientId}/odontogramas/${borrador.id}`,
        {
          method: esNuevo ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo: borrador.tipo,
            fecha: borrador.fecha,
            nota: borrador.nota,
            datos: borrador.datos,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar el odontograma.");
        return;
      }
      const guardado = odontogramaFromApi(data.odontograma);
      setGuardados((prev) => ordenar([...prev.filter((o) => o.id !== guardado.id), guardado]));
      setSeleccion(guardado.id ?? null);
      setBorrador(guardado);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!original?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/odontogramas/${original.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo eliminar el odontograma.");
        return;
      }
      const restantes = guardados.filter((o) => o.id !== original.id);
      setGuardados(restantes);
      const ultimo = restantes[restantes.length - 1] ?? null;
      setSeleccion(ultimo?.id ?? null);
      setBorrador(ultimo);
      setComparar(false);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setDeleting(false);
      setConfirmarEliminar(false);
    }
  }

  let nroVisita = 0;
  const chips = guardados.map((o) => ({
    key: o.id!,
    valor: o,
    titulo: o.tipo === "INICIAL" ? "Inicial" : `Visita ${++nroVisita}`,
  }));
  const tieneInicial = guardados.some((o) => o.tipo === "INICIAL");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">Odontograma</h3>
          <p className="text-sm text-muted-foreground">
            Estado inicial y cómo queda la boca después de cada visita. Se guarda con su propio botón.
          </p>
        </div>
        {guardados.length > 0 && (
          <Button type="button" onClick={registrarVisita} disabled={seleccion === NUEVO}>
            <Plus className="size-4" />
            Registrar visita
          </Button>
        )}
      </header>

      {guardados.length > 0 && (
        <nav aria-label="Visitas" className="-mx-1 overflow-x-auto px-1">
          <ol className="flex w-max items-center gap-2 pb-1">
            {chips.map(({ key, valor, titulo }) => (
              <li key={key}>
                <ChipVisita
                  activo={seleccion === key}
                  titulo={titulo}
                  fecha={formatFechaCorta(valor.fecha)}
                  onClick={() => seleccionar(valor)}
                />
              </li>
            ))}
            {seleccion === NUEVO && borrador && (
              <li>
                <ChipVisita
                  activo
                  nuevo
                  titulo={borrador.tipo === "INICIAL" ? "Inicial" : "Nueva visita"}
                  fecha={formatFechaCorta(borrador.fecha)}
                />
              </li>
            )}
          </ol>
        </nav>
      )}

      {!borrador ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Smile className="size-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">Todavía no hay odontograma</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Empezá registrando cómo llegó el paciente a la primera consulta.
            </p>
          </div>
          <Button type="button" onClick={registrarVisita}>
            <Plus className="size-4" />
            Cargar odontograma inicial
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={fechaId}>Fecha de la visita</Label>
                <DateInput
                  id={fechaId}
                  className="w-44"
                  value={borrador.fecha}
                  onChange={(fecha) => setBorrador({ ...borrador, fecha })}
                />
              </div>
              {!tieneInicial && borrador.tipo === "CONTROL" && (
                <p className="max-w-56 pb-2 text-xs text-muted-foreground">
                  No hay odontograma inicial: esta visita se guarda como control.
                </p>
              )}
              {anterior && (
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <Switch checked={comparar} onCheckedChange={setComparar} />
                  Resaltar cambios vs. {formatFechaCorta(anterior.fecha)}
                </label>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {original?.id && !sucio && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmarEliminar(true)}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              )}
              {sucio && (
                <Button type="button" variant="outline" onClick={descartar} disabled={saving}>
                  <Undo2 className="size-4" />
                  Descartar
                </Button>
              )}
              <Button type="button" onClick={guardar} disabled={!sucio || saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {saving ? "Guardando..." : seleccion === NUEVO ? "Guardar visita" : "Guardar cambios"}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <OdontogramaEditor
            key={seleccion ?? "ninguno"}
            datos={borrador.datos}
            onChange={(datos) => setBorrador({ ...borrador, datos })}
            nota={borrador.nota}
            onNotaChange={(nota) => setBorrador({ ...borrador, nota })}
            resaltadas={resaltadas}
            notaId={notaId}
          />
        </>
      )}

      <Dialog open={confirmarEliminar} onOpenChange={(open) => !open && setConfirmarEliminar(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar odontograma</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se va a ocultar el odontograma del {original ? formatFechaCorta(original.fecha) : ""}. Queda
            registrado en el historial de auditoría.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmarEliminar(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={eliminar} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendiente !== null} onOpenChange={(open) => !open && setPendiente(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambios sin guardar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El odontograma que estás editando tiene cambios sin guardar. ¿Querés descartarlos?
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendiente(null)}>
              Seguir editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const accion = pendiente;
                setPendiente(null);
                accion?.();
              }}
            >
              Descartar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChipVisita({
  activo,
  nuevo = false,
  titulo,
  fecha,
  onClick,
}: {
  activo: boolean;
  nuevo?: boolean;
  titulo: string;
  fecha: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={activo ? "step" : undefined}
      className={cn(
        "flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        activo
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
        nuevo && "border-dashed"
      )}
    >
      <span className="text-xs font-semibold">{titulo}</span>
      <span className="text-[11px] tabular-nums">{fecha}</span>
    </button>
  );
}
