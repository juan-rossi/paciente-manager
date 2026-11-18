"use client";

import { useId, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { aplicarPracticas, datosVacios, diffOdontograma } from "@/lib/odontograma";
import { OdontogramaEditor } from "@/components/odontograma/odontograma-editor";
import { OdontogramaVista } from "@/components/odontograma/odontograma-vista";
import { PracticasVisita } from "@/components/odontograma/practicas-visita";
import type { PracticaVisita } from "@/lib/practica-odontologica";
import { DateInput } from "./date-input";
import { formatFechaCorta, odontogramaFromApi } from "./utils";
import type { OdontogramaValue } from "./types";

const SIN_PRACTICAS: PracticaVisita[] = [];

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
  // Sin odontogramas guardados se arranca directo con uno inicial limpio.
  const [seleccion, setSeleccion] = useState<string | null>(
    () => guardados[guardados.length - 1]?.id ?? NUEVO
  );
  const [borrador, setBorrador] = useState<OdontogramaValue>(
    () => guardados[guardados.length - 1] ?? odontogramaVacio("INICIAL")
  );
  const [comparar, setComparar] = useState(true);
  // La ficha abre en lectura; se edita una visita a la vez. Sin nada guardado
  // se arranca directo editando el inicial.
  const [editando, setEditando] = useState(() => initialOdontogramas.length === 0);
  // Prácticas del nomenclador por visita (id del odontograma). Se guardan por
  // su cuenta, así que viven aparte del borrador de la visita.
  const [practicasPorVisita, setPracticasPorVisita] = useState<Record<string, PracticaVisita[]>>(
    () => Object.fromEntries(initialOdontogramas.flatMap((o) => (o.id ? [[o.id, o.practicas ?? []]] : [])))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creandoVisita, setCreandoVisita] = useState(false);
  // Acción que quedó pendiente porque había cambios sin guardar.
  const [pendiente, setPendiente] = useState<(() => void) | null>(null);

  const original = seleccion === NUEVO ? null : guardados.find((o) => o.id === seleccion) ?? null;
  const sucio = original
    ? !mismoContenido(borrador, original)
    : // Inicial en blanco: recién hay algo que guardar cuando se carga algún dato.
      guardados.length > 0 ||
      borrador.nota.trim() !== "" ||
      diffOdontograma(datosVacios(), borrador.datos).size > 0;

  // Snapshot anterior al seleccionado (para "comparar"): el último guardado
  // antes que él; para una visita nueva, el último guardado.
  const anterior = useMemo(() => {
    if (seleccion === NUEVO) return guardados[guardados.length - 1] ?? null;
    const idx = guardados.findIndex((o) => o.id === seleccion);
    return idx > 0 ? guardados[idx - 1] : null;
  }, [seleccion, guardados]);

  // La visita anterior tal como quedó: lo que se hizo en ella ya es existente
  // (así arranca la visita siguiente), para no resaltarlo como cambio.
  const anteriorDatos = useMemo(
    () =>
      anterior
        ? aplicarPracticas(anterior.datos, (anterior.id && practicasPorVisita[anterior.id]) || [], "existente")
        : null,
    [anterior, practicasPorVisita]
  );

  const practicasSeleccion = (original?.id && practicasPorVisita[original.id]) || SIN_PRACTICAS;
  // Lo que se muestra fuera del editor: las requeridas con práctica cargada en
  // esta visita, en verde. No se guarda; sale de las prácticas.
  const datosVista = aplicarPracticas(borrador.datos, practicasSeleccion, "realizada");

  const resaltadas = useMemo(
    () => (comparar && anteriorDatos ? diffOdontograma(anteriorDatos, borrador.datos) : undefined),
    [comparar, anteriorDatos, borrador]
  );

  function protegerCambios(accion: () => void) {
    if (sucio) setPendiente(() => accion);
    else accion();
  }

  function seleccionar(o: OdontogramaValue) {
    protegerCambios(() => {
      setSeleccion(o.id ?? null);
      setBorrador(o);
      setComparar(true);
      setEditando(false);
      setError(null);
    });
  }

  function registrarVisita() {
    protegerCambios(() => {
      const ultimo = guardados[guardados.length - 1];
      if (!ultimo) {
        // Sin nada guardado no hay de dónde copiar: se arranca el inicial en blanco.
        setBorrador(odontogramaVacio("INICIAL"));
        setSeleccion(NUEVO);
        setComparar(false);
        setEditando(true);
        setError(null);
        return;
      }
      // La visita se crea en la base al toque para poder cargarle prácticas
      // sin tener que guardarla primero. Arranca con el estado en que quedó la
      // anterior: lo hecho en ella ya es existente (rojo).
      void crearVisita({
        tipo: "CONTROL",
        fecha: hoy(),
        nota: "",
        datos: aplicarPracticas(ultimo.datos, (ultimo.id && practicasPorVisita[ultimo.id]) || [], "existente"),
      });
    });
  }

  async function crearVisita(nueva: OdontogramaValue) {
    setCreandoVisita(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/odontogramas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nueva),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo registrar la visita.");
        return;
      }
      const creada = odontogramaFromApi(data.odontograma);
      setGuardados((prev) => ordenar([...prev, creada]));
      if (creada.id) setPracticasPorVisita((prev) => ({ ...prev, [creada.id!]: [] }));
      setSeleccion(creada.id ?? null);
      setBorrador(creada);
      setComparar(true);
      setEditando(true);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCreandoVisita(false);
    }
  }

  function mostrarUltimo(lista: OdontogramaValue[]) {
    const ultimo = lista[lista.length - 1];
    setBorrador(ultimo ?? odontogramaVacio("INICIAL"));
    setSeleccion(ultimo?.id ?? NUEVO);
  }

  // Sale de la edición volviendo a lo guardado (pide confirmación si hay cambios).
  function cancelarEdicion() {
    protegerCambios(() => {
      if (original) setBorrador(original);
      else mostrarUltimo(guardados);
      setEditando(false);
      setError(null);
    });
  }

  // Inicial todavía sin guardar: no hay a dónde volver, solo se limpia.
  function descartarInicial() {
    setBorrador(odontogramaVacio("INICIAL"));
    setError(null);
  }

  async function guardar() {
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
      setEditando(false);
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
      mostrarUltimo(restantes);
      setComparar(false);
      setEditando(restantes.length === 0);
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
  const chipSeleccionado = chips.find((c) => c.key === seleccion);
  const visitaLabel = chipSeleccionado
    ? `${chipSeleccionado.titulo} · ${formatFechaCorta(chipSeleccionado.valor.fecha)}`
    : "";

  const puedeSalir = guardados.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h3 className="text-base font-semibold">Odontograma</h3>
        {guardados.length > 0 && (
          <SelectorVisita
            opciones={[
              ...chips.map(({ key, valor, titulo }) => ({
                key,
                titulo,
                fecha: formatFechaCorta(valor.fecha),
              })),
              ...(seleccion === NUEVO
                ? [
                    {
                      key: NUEVO,
                      titulo: borrador.tipo === "INICIAL" ? "Inicial" : "Nueva visita",
                      fecha: formatFechaCorta(borrador.fecha),
                      nuevo: true,
                    },
                  ]
                : []),
            ]}
            actual={seleccion}
            onSelect={(key) => {
              const chip = chips.find((c) => c.key === key);
              if (chip && chip.key !== seleccion) seleccionar(chip.valor);
            }}
          />
        )}
        {!editando && (
          <div className="ml-auto flex items-center gap-2">
            {original?.id && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                title="Eliminar esta visita"
                aria-label="Eliminar esta visita"
                onClick={() => setConfirmarEliminar(true)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setEditando(true)}>
              <Pencil className="size-4" />
              Editar
            </Button>
            <Button type="button" onClick={registrarVisita} disabled={creandoVisita}>
              {creandoVisita ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {creandoVisita ? "Registrando..." : "Registrar visita"}
            </Button>
          </div>
        )}
      </header>

      {editando && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={fechaId} className="text-muted-foreground">
              Fecha
            </Label>
            <DateInput
              id={fechaId}
              className="w-40"
              value={borrador.fecha}
              onChange={(fecha) => setBorrador({ ...borrador, fecha })}
            />
          </div>
          {!tieneInicial && borrador.tipo === "CONTROL" && (
            <p className="max-w-64 text-xs text-muted-foreground">
              No hay odontograma inicial: esta visita se guarda como control.
            </p>
          )}
          {anterior && (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={comparar} onCheckedChange={setComparar} />
              Resaltar cambios vs. {formatFechaCorta(anterior.fecha)}
            </label>
          )}
          <div className="ml-auto flex items-center gap-2">
            {puedeSalir ? (
              <Button type="button" variant="ghost" onClick={cancelarEdicion} disabled={saving}>
                Cancelar
              </Button>
            ) : (
              sucio && (
                <Button type="button" variant="ghost" onClick={descartarInicial} disabled={saving}>
                  <Undo2 className="size-4" />
                  Descartar
                </Button>
              )
            )}
            <Button type="button" onClick={guardar} disabled={!sucio || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving
                ? "Guardando..."
                : seleccion !== NUEVO
                  ? "Guardar cambios"
                  : borrador.tipo === "INICIAL"
                    ? "Guardar odontograma"
                    : "Guardar visita"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {editando ? (
        <OdontogramaEditor
          key={`editor-${seleccion ?? "ninguno"}`}
          datos={borrador.datos}
          onChange={(datos) => setBorrador({ ...borrador, datos })}
          nota={borrador.nota}
          onNotaChange={(nota) => setBorrador({ ...borrador, nota })}
          resaltadas={resaltadas}
          notaId={notaId}
        />
      ) : (
        <OdontogramaVista
          datos={datosVista}
          nota={borrador.nota}
          anterior={
            anterior && anteriorDatos
              ? { datos: anteriorDatos, fecha: formatFechaCorta(anterior.fecha) }
              : null
          }
        />
      )}
      <PracticasVisita
        key={`practicas-${original?.id ?? "nueva"}`}
        patientId={patientId}
        odontogramaId={original?.id ?? null}
        visitaLabel={visitaLabel}
        datos={datosVista}
        practicas={practicasSeleccion}
        onChange={(actualizar) => {
          const id = original?.id;
          if (!id) return;
          setPracticasPorVisita((prev) => ({ ...prev, [id]: actualizar(prev[id] ?? []) }));
        }}
      />

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

type OpcionVisita = { key: string; titulo: string; fecha: string; nuevo?: boolean };

// Selector de ancho fijo: flechas para ir a la visita anterior/siguiente y un
// menú con todas. Reemplaza la tira de chips, que con muchas visitas obligaba
// a scrollear horizontalmente.
function SelectorVisita({
  opciones,
  actual,
  onSelect,
}: {
  opciones: OpcionVisita[];
  actual: string | null;
  onSelect: (key: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const idx = opciones.findIndex((o) => o.key === actual);
  const sel = idx >= 0 ? opciones[idx] : null;
  const previa = idx > 0 ? opciones[idx - 1] : null;
  const siguiente = idx >= 0 && idx < opciones.length - 1 ? opciones[idx + 1] : null;

  const flecha =
    "flex h-8 w-8 items-center justify-center text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-35";

  return (
    <nav aria-label="Visitas" className="flex min-w-0 items-center gap-2.5">
      <div
        className={cn(
          "flex min-w-0 items-stretch overflow-hidden rounded-lg border bg-card",
          sel?.nuevo ? "border-dashed border-primary" : "border-border"
        )}
      >
        <button
          type="button"
          className={flecha}
          disabled={!previa}
          onClick={() => previa && onSelect(previa.key)}
          aria-label={previa ? `Ir a ${previa.titulo}` : "No hay visita anterior"}
          title={previa ? `${previa.titulo} · ${previa.fecha}` : undefined}
        >
          <ChevronLeft className="size-4" />
        </button>
        <Popover open={abierto} onOpenChange={setAbierto}>
          <PopoverTrigger
            type="button"
            aria-label="Elegir visita"
            className="flex min-w-0 items-baseline gap-2 border-x border-border px-3 py-1 text-left whitespace-nowrap transition-colors outline-none hover:bg-muted focus-visible:bg-muted aria-expanded:bg-muted"
          >
            <span className="truncate text-sm font-semibold">{sel?.titulo ?? "Elegir visita"}</span>
            {sel && <span className="text-xs text-muted-foreground tabular-nums">{sel.fecha}</span>}
            <ChevronDown className="size-3.5 shrink-0 self-center text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 gap-0 p-1.5">
            <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
              {opciones.length} {opciones.length === 1 ? "visita" : "visitas"}
            </p>
            <ul className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
              {[...opciones].reverse().map((o) => {
                const activa = o.key === actual;
                return (
                  <li key={o.key}>
                    <button
                      type="button"
                      aria-current={activa ? "step" : undefined}
                      onClick={() => {
                        setAbierto(false);
                        if (!activa) onSelect(o.key);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none hover:bg-muted focus-visible:bg-muted",
                        activa && "bg-primary/10 font-semibold text-primary hover:bg-primary/15"
                      )}
                    >
                      <span className="flex-1 truncate">
                        {o.titulo}
                        {o.nuevo && <span className="ml-1.5 text-xs font-normal">(sin guardar)</span>}
                      </span>
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          activa ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {o.fecha}
                      </span>
                      <Check className={cn("size-3.5 shrink-0", !activa && "invisible")} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          className={flecha}
          disabled={!siguiente}
          onClick={() => siguiente && onSelect(siguiente.key)}
          aria-label={siguiente ? `Ir a ${siguiente.titulo}` : "No hay visita siguiente"}
          title={siguiente ? `${siguiente.titulo} · ${siguiente.fecha}` : undefined}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {idx >= 0 && opciones.length > 1 && (
        <span className="hidden text-xs text-muted-foreground tabular-nums sm:inline">
          {idx + 1} de {opciones.length}
        </span>
      )}
    </nav>
  );
}
