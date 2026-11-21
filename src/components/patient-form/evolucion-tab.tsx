"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Lock,
  Mic,
  MicOff,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { textoPlano } from "@/lib/evolucion-formato";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EvolucionValue } from "./types";
import {
  ASISTENCIA_LABELS,
  ASISTENCIA_SESION_OPTIONS,
  MODALIDAD_LABELS,
  MODALIDAD_SESION_OPTIONS,
  NIVEL_RIESGO_OPTIONS,
  RIESGO_LABELS,
  numerarSesiones,
  vocabularioEvolucion,
  type AsistenciaSesion,
  type ModalidadSesion,
  type NivelRiesgo,
} from "./constants";
import { cn } from "@/lib/utils";
import { camposSesionFromApi, formatFechaCorta, formatFechaRelativa } from "./utils";
import { useCloudTranscription } from "./use-cloud-transcription";
import { TITULO_YA_RESUMIDO, useResumenIA } from "./use-resumen-ia";
import { DictadoCompleto } from "./dictado-completo";
import { anexarTexto, formatElapsed, mensajeErrorDictado } from "./dictado-utils";
import { DateInput } from "./date-input";
import { EditorConFormato } from "./editor-con-formato";
import { TextoConFormato } from "./texto-con-formato";
import { formatDateParamBA } from "@/lib/timezone";

// Selector de una opción entre pocas (asistencia, modalidad, riesgo), a la
// vista y de un click. Con `opcional`, tocar la opción elegida la desmarca.
function Segmentado<T extends string>({
  label,
  options,
  value,
  onChange,
  opcional = false,
  claseElegida,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  opcional?: boolean;
  claseElegida?: (value: T) => string | undefined;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const elegida = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={elegida}
              onClick={() => onChange(elegida && opcional ? null : o.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                elegida
                  ? (claseElegida?.(o.value) ?? "border-primary bg-primary text-primary-foreground")
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Colores del riesgo, elegido en el diálogo y como badge en cada sesión.
const CLASE_RIESGO: Record<NivelRiesgo, string> = {
  SIN_RIESGO: "border-emerald-600 bg-emerald-600 text-white",
  BAJO: "border-sky-600 bg-sky-600 text-white",
  MODERADO: "border-amber-500 bg-amber-500 text-white",
  ALTO: "border-destructive bg-destructive text-white",
};

// En el diálogo alcanza con "Bajo", "Moderado"... (el label ya dice "Riesgo").
const RIESGO_OPCIONES_CORTAS = NIVEL_RIESGO_OPTIONS.map((o) => ({
  value: o.value,
  label:
    o.value === "SIN_RIESGO"
      ? o.label
      : o.label.replace("Riesgo ", "").replace(/^./, (c) => c.toUpperCase()),
}));

function sortByFechaAsc(evoluciones: EvolucionValue[]) {
  return [...evoluciones].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Lo que devuelve la API para una evolución -> el valor que usa el formulario.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function evolucionFromApi(e: any): EvolucionValue {
  return {
    id: e.id,
    fecha: e.fecha.slice(0, 10),
    contenido: e.contenido,
    contenidoDictado: e.contenidoDictado ?? null,
    ...camposSesionFromApi(e),
  };
}

// `new Date().toISOString()` da la fecha en UTC, y los componentes LOCALES
// del proceso tampoco sirven: en producción (Vercel) el proceso corre en UTC,
// no en horario de Argentina, así que cerca de medianoche en Argentina ya
// habría caído en el día siguiente. `formatDateParamBA` no depende del TZ
// del proceso.
function todayLocal() {
  return formatDateParamBA(new Date());
}

type Props = {
  patientId?: string;
  evoluciones: EvolucionValue[];
  onChangeEvoluciones: (next: EvolucionValue[]) => void;
  evolucionesEliminadas?: EvolucionValue[];
  onChangeEvolucionesEliminadas?: (next: EvolucionValue[]) => void;
  // La transcripción es una función Premium: sin plan Premium vigente no se
  // muestra ningún control de dictado.
  transcripcionHabilitada?: boolean;
  // Resume solo apenas termina cada dictado (ver Configuración > Dictado e IA).
  resumirAlTerminar?: boolean;
  // Psicología (ver esPsicologia()): cada entrada es una "sesión".
  psicologia?: boolean;
};

export function EvolucionTab({
  patientId,
  evoluciones,
  onChangeEvoluciones,
  evolucionesEliminadas = [],
  onChangeEvolucionesEliminadas,
  transcripcionHabilitada = false,
  resumirAlTerminar = false,
  psicologia = false,
}: Props) {
  const voc = vocabularioEvolucion(psicologia);
  const editorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [fecha, setFecha] = useState(todayLocal());
  const [contenido, setContenido] = useState("");
  // Texto original dictado, cuando `contenido` pasó a ser un resumen de IA.
  const [dictado, setDictado] = useState("");
  // Solo sesiones de psicología.
  const [asistencia, setAsistencia] = useState<AsistenciaSesion>("PRESENTE");
  const [modalidad, setModalidad] = useState<ModalidadSesion | null>(null);
  const [riesgo, setRiesgo] = useState<NivelRiesgo | null>(null);
  const [notasPrivadas, setNotasPrivadas] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  // Cambia con cada formulario nuevo: un resumen que llega después de cerrar
  // el diálogo no debe escribir sobre la próxima evolución.
  const formularioRef = useRef(0);

  const transcription = useCloudTranscription();
  const resumen = useResumenIA("evolucion");

  const isEditing = editingIndex !== null;
  const numeros = psicologia ? numerarSesiones(evoluciones) : null;
  // Sin notas solo se puede guardar una sesión a la que no vino.
  const asistio = !psicologia || asistencia === "PRESENTE";
  const puedeGuardar = textoPlano(contenido).trim().length > 0 || !asistio;
  const sesion = psicologia
    ? { asistencia, modalidad, riesgo, notasPrivadas: notasPrivadas.trim() || null }
    : {};
  const isRecording =
    transcription.recordingStatus === "grabando" || transcription.recordingStatus === "conectando";
  const ocupado = transcription.recordingStatus === "finalizando" || resumen.resumiendo;
  const fuenteResumen = dictado.trim() ? dictado : contenido;
  const yaResumido = resumen.yaResumido(fuenteResumen);
  const errorDictado = mensajeErrorDictado(transcription.error, transcription.mensajeTopeIA);

  function resetForm() {
    setFecha(todayLocal());
    setContenido("");
    setDictado("");
    setAsistencia("PRESENTE");
    // La modalidad suele repetirse: arranca como la de la última sesión.
    setModalidad(evoluciones.at(-1)?.modalidad ?? null);
    setRiesgo(null);
    setNotasPrivadas("");
    setError(null);
    resumen.limpiarError();
    resumen.marcarResumido("");
    setEditingIndex(null);
    formularioRef.current += 1;
  }

  // Mientras se graba y transcribe el textarea no se muestra, así que
  // `contenido`/`dictado` no cambian entre `iniciar()` y este callback.
  function handleTextoFinal(texto: string) {
    const nuevoContenido = anexarTexto(contenido, texto);
    // Si ya se resumió, el dictado original sigue siendo el registro
    // completo: lo nuevo se suma también ahí.
    const nuevoDictado = dictado.trim() ? anexarTexto(dictado, texto) : "";
    setContenido(nuevoContenido);
    setDictado(nuevoDictado);
    // Si el resumen falla, queda la transcripción y se muestra el error.
    if (resumirAlTerminar) void resumirDesde(nuevoDictado || nuevoContenido);
  }

  async function resumirDesde(fuente: string) {
    // La IA recibe el texto sin marcas de formato, y el resumen vuelve sin
    // formato. El original queda guardado como dictado, también sin marcas.
    const plano = textoPlano(fuente);
    if (!plano.trim()) return;
    const formulario = formularioRef.current;
    const texto = await resumen.resumir(plano);
    if (texto === null || formulario !== formularioRef.current) return;
    setDictado(plano);
    setContenido(texto);
  }

  async function handleResumir() {
    // Una vez resumido, se vuelve a resumir siempre desde el dictado
    // completo, no desde un resumen previo.
    await resumirDesde(fuenteResumen);
  }

  function handleRestaurarDictado() {
    setContenido(dictado);
    setDictado("");
  }

  function openAddDialog() {
    resetForm();
    setOpen(true);
  }

  function openEditDialog(entry: EvolucionValue, index: number) {
    formularioRef.current += 1;
    setEditingIndex(index);
    setFecha(entry.fecha);
    setContenido(entry.contenido);
    setDictado(entry.contenidoDictado ?? "");
    setAsistencia(entry.asistencia ?? "PRESENTE");
    setModalidad(entry.modalidad ?? null);
    setRiesgo(entry.riesgo ?? null);
    setNotasPrivadas(entry.notasPrivadas ?? "");
    setError(null);
    resumen.limpiarError();
    // Si la evolución guardada trae dictado, ese dictado ya se resumió.
    resumen.marcarResumido(entry.contenidoDictado ?? "");
    setOpen(true);
  }

  async function handleGuardar() {
    if (!puedeGuardar) return;
    setError(null);

    if (isEditing) {
      const entry = evoluciones[editingIndex];
      if (patientId && entry.id) {
        setSaving(true);
        try {
          const response = await fetch(`/api/patients/${patientId}/evoluciones/${entry.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha, contenido, contenidoDictado: dictado, ...sesion }),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            setError(data?.error ?? `No se pudo editar ${voc.una}.`);
            return;
          }
          onChangeEvoluciones(
            sortByFechaAsc(
              evoluciones.map((e, i) =>
                i === editingIndex ? evolucionFromApi(data.evolucion) : e
              )
            )
          );
          setOpen(false);
          resetForm();
        } finally {
          setSaving(false);
        }
      } else {
        onChangeEvoluciones(
          sortByFechaAsc(
            evoluciones.map((e, i) =>
              i === editingIndex
                ? { ...e, fecha, contenido, contenidoDictado: dictado || null, ...sesion }
                : e
            )
          )
        );
        setOpen(false);
        resetForm();
      }
      return;
    }

    if (patientId) {
      setSaving(true);
      try {
        const response = await fetch(`/api/patients/${patientId}/evoluciones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fecha, contenido, contenidoDictado: dictado, ...sesion }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setError(data?.error ?? `No se pudo agregar ${voc.una}.`);
          return;
        }
        onChangeEvoluciones(
          sortByFechaAsc([
            ...evoluciones,
            evolucionFromApi(data.evolucion),
          ])
        );
        setOpen(false);
        resetForm();
      } finally {
        setSaving(false);
      }
    } else {
      onChangeEvoluciones(
        sortByFechaAsc([
          ...evoluciones,
          { fecha, contenido, contenidoDictado: dictado || null, ...sesion },
        ])
      );
      setOpen(false);
      resetForm();
    }
  }

  async function handleConfirmarEliminar() {
    if (deleteIndex === null) return;
    const entry = evoluciones[deleteIndex];

    if (patientId && entry.id) {
      setDeleting(true);
      try {
        const response = await fetch(`/api/patients/${patientId}/evoluciones/${entry.id}`, {
          method: "DELETE",
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          setError(`No se pudo eliminar ${voc.una}.`);
          return;
        }
        // La evolución no se destruye (Ley 26.529) -- pasa a la lista de
        // eliminadas para poder restaurarla, no desaparece sin dejar rastro.
        onChangeEvolucionesEliminadas?.([
          ...evolucionesEliminadas,
          { ...evolucionFromApi(data.evolucion), deletedAt: data.evolucion.deletedAt },
        ]);
      } finally {
        setDeleting(false);
      }
    }
    onChangeEvoluciones(evoluciones.filter((_, i) => i !== deleteIndex));
    setDeleteIndex(null);
  }

  async function handleRestaurar(entry: EvolucionValue) {
    if (!patientId || !entry.id) return;
    setRestoringId(entry.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/patients/${patientId}/evoluciones/${entry.id}/restore`,
        { method: "POST" }
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(`No se pudo restaurar ${voc.una}.`);
        return;
      }
      onChangeEvolucionesEliminadas?.(evolucionesEliminadas.filter((e) => e.id !== entry.id));
      onChangeEvoluciones(
        sortByFechaAsc([
          ...evoluciones,
          evolucionFromApi(data.evolucion),
        ])
      );
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        {evoluciones.length === 0 && (
          <p className="text-sm text-muted-foreground">{voc.vacio}</p>
        )}
        {evoluciones.map((entry, index) => (
          <Card key={entry.id ?? `local-${index}`}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  {numeros?.has(entry) && (
                    <span className="text-sm font-bold">Sesión {numeros.get(entry)}</span>
                  )}
                  <span className={cn("text-sm", numeros ? "text-muted-foreground" : "font-bold")}>
                    {formatFechaCorta(entry.fecha)}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({formatFechaRelativa(entry.fecha)})
                    </span>
                  </span>
                  {entry.asistencia && entry.asistencia !== "PRESENTE" && (
                    <Badge variant="secondary">{ASISTENCIA_LABELS.get(entry.asistencia)}</Badge>
                  )}
                  {entry.modalidad && (
                    <Badge variant="outline">{MODALIDAD_LABELS.get(entry.modalidad)}</Badge>
                  )}
                  {entry.riesgo && (
                    <Badge className={CLASE_RIESGO[entry.riesgo]}>
                      {RIESGO_LABELS.get(entry.riesgo)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEditDialog(entry, index)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={voc.editar}
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteIndex(index)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={voc.eliminar}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {entry.contenido && <TextoConFormato texto={entry.contenido} className="text-sm" />}
              <DictadoCompleto dictado={entry.contenidoDictado} />
              {entry.notasPrivadas && (
                <div className="flex flex-col gap-1 rounded-md bg-muted/60 p-3">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Lock className="size-3" />
                    Notas privadas
                  </span>
                  <p className="whitespace-pre-wrap text-sm">{entry.notasPrivadas}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {evolucionesEliminadas.length > 0 && (
        <details className="group overflow-hidden rounded-xl border border-border/60">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-2 bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground sm:px-5 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Trash2 className="size-3.5" />
              </span>
              {voc.eliminadas} ({evolucionesEliminadas.length})
            </span>
            <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="flex flex-col gap-3 border-t border-border/60 p-3">
            {evolucionesEliminadas.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-muted-foreground line-through">
                      {formatFechaCorta(entry.fecha)}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={restoringId === entry.id}
                      onClick={() => handleRestaurar(entry)}
                    >
                      {restoringId === entry.id ? "Restaurando..." : "Restaurar"}
                    </Button>
                  </div>
                  <TextoConFormato
                    texto={entry.contenido}
                    className="text-sm text-muted-foreground line-through"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      <div className="flex items-center justify-end gap-3">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              transcription.detener({ descartar: true });
              resetForm();
            }
            setOpen(next);
          }}
        >
          <Button type="button" onClick={openAddDialog}>
            <Plus className="size-4" />
            {voc.nueva}
          </Button>
          <DialogContent
            className={psicologia ? "sm:max-w-2xl" : "sm:max-w-xl"}
            initialFocus={editorRef}
          >
            <DialogHeader>
              <DialogTitle>{isEditing ? voc.editar : voc.nueva}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              {psicologia ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Fecha</Label>
                    <DateInput value={fecha} onChange={setFecha} />
                  </div>
                  <Segmentado
                    label="Asistencia"
                    options={ASISTENCIA_SESION_OPTIONS}
                    value={asistencia}
                    onChange={(v) => setAsistencia(v ?? "PRESENTE")}
                  />
                  <Segmentado
                    label="Modalidad"
                    options={MODALIDAD_SESION_OPTIONS}
                    value={modalidad}
                    onChange={setModalidad}
                    opcional
                  />
                  <Segmentado
                    label="Riesgo"
                    options={RIESGO_OPCIONES_CORTAS}
                    value={riesgo}
                    onChange={setRiesgo}
                    opcional
                    claseElegida={(v) => CLASE_RIESGO[v]}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <Label>Fecha</Label>
                  <DateInput value={fecha} onChange={setFecha} />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Label>
                    {voc.campo}
                    {!asistio && <span className="font-normal text-muted-foreground"> (opcional)</span>}
                  </Label>
                  {transcripcionHabilitada && (
                    <div className="flex items-center gap-2">
                      {isRecording ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => transcription.detener()}
                        >
                          <MicOff className="size-3.5" />
                          Detener dictado
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={ocupado}
                          onClick={() => void transcription.iniciar(handleTextoFinal)}
                        >
                          <Mic className="size-3.5" />
                          Dictar
                        </Button>
                      )}
                      {/* El tooltip va en el span: el botón deshabilitado no recibe
                          el hover y no mostraría su `title`. */}
                      <span
                        title={yaResumido ? TITULO_YA_RESUMIDO : undefined}
                        className="inline-flex"
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isRecording || ocupado || !fuenteResumen.trim() || yaResumido}
                          onClick={() => void handleResumir()}
                        >
                          {resumen.resumiendo ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="size-3.5" />
                          )}
                          {resumen.resumiendo ? "Resumiendo…" : "Resumir con IA"}
                        </Button>
                      </span>
                    </div>
                  )}
                </div>
                {transcription.recordingStatus === "conectando" && (
                  <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-md border p-6 text-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Conectando con el micrófono…</p>
                  </div>
                )}
                {transcription.recordingStatus === "grabando" && (
                  <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-md border p-6 text-center">
                    <Badge variant="destructive">
                      <span className="size-1.5 animate-pulse rounded-full bg-current" />
                      Grabando…
                    </Badge>
                    <span className="font-mono text-3xl tabular-nums">
                      {formatElapsed(transcription.elapsedSeconds)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      El texto aparece al detener. Máximo {transcription.maxSeconds / 60} minutos.
                    </p>
                  </div>
                )}
                {transcription.recordingStatus === "finalizando" && (
                  <div className="flex min-h-[15rem] flex-col items-center justify-center gap-3 rounded-md border p-6 text-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      <strong>Transcribiendo…</strong>
                      <br />
                      El resultado va a aparecer acá en unos segundos.
                    </p>
                  </div>
                )}
                {(transcription.recordingStatus === "idle" ||
                  transcription.recordingStatus === "error") && (
                  <>
                    <EditorConFormato
                      ref={editorRef}
                      aria-label={voc.campo}
                      // Crece con el texto pero con tope: pasado el 50% del alto
                      // de pantalla scrollea, así el botón de guardar nunca queda
                      // fuera del viewport.
                      className={cn(
                        "overflow-y-auto",
                        psicologia ? "max-h-[35dvh] min-h-[10rem]" : "max-h-[50dvh] min-h-[15rem]"
                      )}
                      value={contenido}
                      onChange={setContenido}
                      disabled={resumen.resumiendo}
                      placeholder={
                        transcripcionHabilitada
                          ? `${voc.placeholder} o presioná «Dictar»...`
                          : `${voc.placeholder}...`
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Seleccioná texto para ponerlo en negrita, cursiva o de color.
                    </p>
                  </>
                )}
              </div>
              {transcripcionHabilitada && (
                <DictadoCompleto dictado={dictado} onRestaurar={handleRestaurarDictado} />
              )}
              {psicologia && (
                <div className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Lock className="size-3.5" />
                    Notas privadas
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Hipótesis e impresiones personales. No salen en la copia para el paciente.
                  </p>
                  <Textarea
                    rows={3}
                    value={notasPrivadas}
                    onChange={(e) => setNotasPrivadas(e.target.value)}
                  />
                </div>
              )}
              {errorDictado && <p className="text-sm text-destructive">{errorDictado}</p>}
              {resumen.error && <p className="text-sm text-destructive">{resumen.error}</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="button" onClick={handleGuardar} disabled={saving || isRecording || ocupado || !puedeGuardar}>
                {saving ? "Guardando..." : isEditing ? "Guardar" : "Agregar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={deleteIndex !== null}
        onOpenChange={(next) => {
          if (!next) setDeleteIndex(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{voc.eliminar}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {voc.esta} dejará de aparecer en la historia clínica. Por la Ley 26.529, el
            registro no se destruye: se conserva de forma segura.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteIndex(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmarEliminar}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
