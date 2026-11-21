"use client";

import { useRef, useState } from "react";
import { Columns2, ImagePlus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatFechaCorta } from "@/components/patient-form/utils";
import { urlFoto, type FotoPendiente } from "@/components/fotos/foto-utils";
import type { FotoValue } from "@/lib/foto-clinica";

let contador = 0;

// Fotos dentro del diálogo de una evolución (dermatología): las que ya tiene
// y las nuevas, cada una con su zona. Las nuevas se suben al guardar la
// evolución.
export function FotosEvolucionEditor({
  patientId,
  existentes,
  pendientes,
  onChangePendientes,
  zonasConocidas,
}: {
  patientId: string | undefined;
  existentes: readonly FotoValue[];
  pendientes: readonly FotoPendiente[];
  onChangePendientes: (next: FotoPendiente[]) => void;
  zonasConocidas: readonly string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function agregar(archivos: FileList | null) {
    if (!archivos) return;
    const nuevas = [...archivos].map((archivo) => ({
      clave: `p${++contador}`,
      archivo,
      previa: URL.createObjectURL(archivo),
      // La zona se repite seguido: arranca como la de la última foto.
      zona: pendientes.at(-1)?.zona ?? "",
      nota: "",
    }));
    onChangePendientes([...pendientes, ...nuevas]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function quitar(clave: string) {
    const p = pendientes.find((x) => x.clave === clave);
    if (p) URL.revokeObjectURL(p.previa);
    onChangePendientes(pendientes.filter((x) => x.clave !== clave));
  }

  function cambiar(clave: string, patch: Partial<FotoPendiente>) {
    onChangePendientes(pendientes.map((x) => (x.clave === clave ? { ...x, ...patch } : x)));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label>Fotos</Label>
        {patientId && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => agregar(e.target.files)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
              <ImagePlus className="size-4" />
              Agregar fotos
            </Button>
          </>
        )}
      </div>
      {!patientId && (
        <p className="text-xs text-muted-foreground">Guardá el paciente para poder agregar fotos a la evolución.</p>
      )}

      {existentes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existentes.map((f) => (
            <figure key={f.id} className="flex flex-col gap-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- ruta autenticada */}
              <img src={urlFoto(patientId!, f, true)} alt="" className="size-14 rounded-md border object-cover" />
              <figcaption className="max-w-14 truncate text-[10px] text-muted-foreground">{f.zona}</figcaption>
            </figure>
          ))}
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="flex flex-col gap-2">
          <datalist id="zonas-fotos-evolucion">
            {zonasConocidas.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          {pendientes.map((p) => (
            <div key={p.clave} className="flex items-start gap-3 rounded-md border border-border/60 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
              <img src={p.previa} alt="" className="size-16 shrink-0 rounded object-cover" />
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <Input
                  list="zonas-fotos-evolucion"
                  placeholder="Zona (ej. espalda)"
                  aria-label="Zona del cuerpo"
                  value={p.zona}
                  onChange={(e) => cambiar(p.clave, { zona: e.target.value })}
                />
                <Input
                  placeholder="Nota (opcional)"
                  aria-label="Nota de la foto"
                  value={p.nota}
                  onChange={(e) => cambiar(p.clave, { nota: e.target.value })}
                />
              </div>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar foto" onClick={() => quitar(p.clave)}>
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Usá el mismo nombre de zona en cada consulta para comparar la lesión en el tiempo.
          </p>
        </div>
      )}
    </div>
  );
}

// Miniaturas de las fotos de una evolución en la lista. Al tocar una se ve
// grande; si hay una foto anterior de la misma zona (de otra evolución), se
// pueden comparar lado a lado. Desde ahí también se elimina.
export function MiniaturasEvolucion({
  patientId,
  fotos,
  todas,
  onEliminada,
}: {
  patientId: string;
  // Las de esta evolución.
  fotos: readonly FotoValue[];
  // Las de todas las evoluciones, para encontrar la anterior de la zona.
  todas: readonly FotoValue[];
  onEliminada: (id: string) => void;
}) {
  const [vista, setVista] = useState<FotoValue | null>(null);
  const [comparar, setComparar] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anterior = vista
    ? todas
        .filter((f) => f.zona === vista.zona && f.id !== vista.id && f.fecha < vista.fecha)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .at(-1) ?? null
    : null;

  function abrir(f: FotoValue) {
    setVista(f);
    setComparar(false);
    setConfirmar(false);
    setError(null);
  }

  async function eliminar() {
    if (!vista) return;
    setEliminando(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/fotos/${vista.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "No se pudo eliminar la foto.");
        return;
      }
      onEliminada(vista.id);
      setVista(null);
    } catch {
      setError("No se pudo eliminar la foto. Revisá la conexión.");
    } finally {
      setEliminando(false);
    }
  }

  if (fotos.length === 0) return null;
  return (
    <>
      {/* Cada foto en su tamaño real, sin pasar el ancho de la tarjeta (y
          manteniendo la proporción). width/height reales reservan el lugar
          antes de que cargue, así la lista no salta. */}
      <div className="flex flex-col gap-3">
        {fotos.map((f) => (
          <figure key={f.id} className="flex flex-col items-start gap-1">
            <button
              type="button"
              onClick={() => abrir(f)}
              className="max-w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Ampliar la foto de ${f.zona}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- ruta autenticada */}
              <img
                src={urlFoto(patientId, f)}
                alt={`${f.zona}, ${formatFechaCorta(f.fecha)}`}
                width={f.ancho}
                height={f.alto}
                loading="lazy"
                className="h-auto max-w-full rounded-md border border-border/60"
              />
            </button>
            <figcaption className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{f.zona}</span>
              {f.nota && ` · ${f.nota}`}
            </figcaption>
          </figure>
        ))}
      </div>
      <Dialog open={vista !== null} onOpenChange={(next) => !next && setVista(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{vista?.zona}</DialogTitle>
          </DialogHeader>
          {vista && (
            <div className="flex flex-col gap-3">
              <div className={comparar && anterior ? "grid grid-cols-2 gap-3" : ""}>
                {comparar && anterior && (
                  <figure className="flex flex-col gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element -- ruta autenticada */}
                    <img
                      src={urlFoto(patientId, anterior)}
                      alt={`${anterior.zona}, ${formatFechaCorta(anterior.fecha)}`}
                      className="max-h-[60vh] w-full rounded-md bg-muted object-contain"
                    />
                    <figcaption className="text-xs text-muted-foreground tabular-nums">
                      {formatFechaCorta(anterior.fecha)}
                      {anterior.nota && <span className="block text-sm text-foreground">{anterior.nota}</span>}
                    </figcaption>
                  </figure>
                )}
                <figure className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- ruta autenticada */}
                  <img
                    src={urlFoto(patientId, vista)}
                    alt={`${vista.zona}, ${formatFechaCorta(vista.fecha)}`}
                    className={`${comparar && anterior ? "max-h-[60vh]" : "max-h-[70vh]"} w-full rounded-md bg-muted object-contain`}
                  />
                  <figcaption className="text-xs text-muted-foreground tabular-nums">
                    {formatFechaCorta(vista.fecha)}
                    {vista.nota && <span className="block text-sm text-foreground">{vista.nota}</span>}
                  </figcaption>
                </figure>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {anterior ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setComparar((c) => !c)}>
                    <Columns2 className="size-4" />
                    {comparar ? "Ver sola" : `Comparar con el ${formatFechaCorta(anterior.fecha)}`}
                  </Button>
                ) : (
                  <span />
                )}
                {confirmar ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Se conserva de forma segura (Ley 26.529).</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setConfirmar(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" variant="destructive" size="sm" onClick={eliminar} disabled={eliminando}>
                      {eliminando ? "Eliminando..." : "Eliminar foto"}
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmar(true)}>
                    <Trash2 className="size-4" />
                    Eliminar
                  </Button>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
