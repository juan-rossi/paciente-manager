"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ARCADAS, CARAS, CARA_LABELS, type Cara } from "@/lib/odontograma";
import {
  CAPITULOS,
  esBusquedaPorCodigo,
  filtrarPracticas,
  nombreCapitulo,
  normalizarTexto,
  type PracticaCatalogo,
} from "@/lib/practica-odontologica";

// ---------------------------------------------------------------------------
// Catálogo: se pide una sola vez por carga de página y se filtra en el cliente.
// ---------------------------------------------------------------------------

let catalogoPromise: Promise<PracticaCatalogo[]> | null = null;

function cargarCatalogo(): Promise<PracticaCatalogo[]> {
  catalogoPromise ??= fetch("/api/practicas-odontologicas")
    .then(async (res) => {
      if (!res.ok) throw new Error("catalogo");
      const data = (await res.json()) as { practicas: PracticaCatalogo[] };
      return data.practicas;
    })
    .catch((e) => {
      // Que el próximo intento vuelva a pedirlo.
      catalogoPromise = null;
      throw e;
    });
  return catalogoPromise;
}

function useCatalogo(activo: boolean) {
  const [practicas, setPracticas] = useState<PracticaCatalogo[] | null>(null);
  const [error, setError] = useState(false);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!activo || practicas) return;
    let vigente = true;
    cargarCatalogo()
      .then((p) => vigente && setPracticas(p))
      .catch(() => vigente && setError(true));
    return () => {
      vigente = false;
    };
  }, [activo, practicas, intento]);
  return {
    practicas,
    error,
    reintentar: () => {
      setError(false);
      setIntento((n) => n + 1);
    },
  };
}

// ---------------------------------------------------------------------------
// Resaltado de lo que coincide con la búsqueda
// ---------------------------------------------------------------------------

function Resaltado({ texto, query, codigo = false }: { texto: string; query: string; codigo?: boolean }) {
  const marcas = useMemo(() => {
    const q = query.trim();
    const m = new Array<boolean>(texto.length).fill(false);
    if (!q) return m;
    if (codigo) {
      if (!esBusquedaPorCodigo(q)) return m;
      const digitos = q.replace(/[.\s]/g, "");
      let n = 0;
      for (let i = 0; i < texto.length && n < digitos.length; i++) {
        if (texto[i] === ".") continue;
        if (texto[i] !== digitos[n]) break;
        m[i] = true;
        n++;
      }
      // Los puntos entre dígitos resaltados también.
      for (let i = 1; i < texto.length - 1; i++) if (texto[i] === "." && m[i - 1] && m[i + 1]) m[i] = true;
      return m;
    }
    if (esBusquedaPorCodigo(q)) return m;
    // normalizarTexto conserva el largo (solo saca diacríticos combinados
    // que NFD separó), así que los índices coinciden con el texto original.
    const plano = normalizarTexto(texto);
    if (plano.length !== texto.length) return m;
    for (const w of normalizarTexto(q).split(/\s+/).filter(Boolean)) {
      let i = plano.indexOf(w);
      while (i > -1) {
        for (let k = i; k < i + w.length; k++) m[k] = true;
        i = plano.indexOf(w, i + 1);
      }
    }
    return m;
  }, [texto, query, codigo]);

  const partes: { t: string; on: boolean }[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ultima = partes[partes.length - 1];
    if (ultima && ultima.on === marcas[i]) ultima.t += texto[i];
    else partes.push({ t: texto[i], on: marcas[i] });
  }
  return (
    <>
      {partes.map((p, i) =>
        p.on ? (
          <mark key={i} className="rounded-sm bg-amber-200/80 px-px text-inherit dark:bg-amber-400/30">
            {p.t}
          </mark>
        ) : (
          <span key={i}>{p.t}</span>
        )
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

const PIEZAS_PERMANENTES = [
  ...ARCADAS.permanente.superior.flat(),
  ...ARCADAS.permanente.inferior.flat(),
].sort((a, b) => a - b);
const PIEZAS_TEMPORALES = [
  ...ARCADAS.temporal.superior.flat(),
  ...ARCADAS.temporal.inferior.flat(),
].sort((a, b) => a - b);

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Ej. "Visita 2 · 16/11/2026".
  subtitulo: string;
  // Guarda la práctica. Devuelve un mensaje de error, o null si salió bien.
  onAgregar: (practica: PracticaCatalogo, pieza: string | null, caras: Cara[]) => Promise<string | null>;
};

export function PracticaPickerDialog({ open, onOpenChange, subtitulo, onAgregar }: Props) {
  const { practicas, error: errorCatalogo, reintentar } = useCatalogo(open);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const piezaId = `${baseId}-pieza`;
  const listaId = `${baseId}-lista`;

  const [query, setQuery] = useState("");
  const [capitulo, setCapitulo] = useState<number | null>(null);
  const [activo, setActivo] = useState(0);
  const [elegida, setElegida] = useState<PracticaCatalogo | null>(null);
  const [pieza, setPieza] = useState("");
  const [caras, setCaras] = useState<Cara[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Cada apertura arranca limpia.
  const [abiertoAntes, setAbiertoAntes] = useState(open);
  if (open !== abiertoAntes) {
    setAbiertoAntes(open);
    if (open) {
      setQuery("");
      setCapitulo(null);
      setActivo(0);
      setElegida(null);
      setPieza("");
      setCaras([]);
      setError(null);
      setAviso(null);
    }
  }

  const coincidencias = useMemo(
    () => (practicas ? filtrarPracticas(practicas, query) : []),
    [practicas, query]
  );
  const porCapitulo = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of coincidencias) m.set(p.capitulo, (m.get(p.capitulo) ?? 0) + 1);
    return m;
  }, [coincidencias]);
  const resultados = useMemo(
    () => (capitulo === null ? coincidencias : coincidencias.filter((p) => p.capitulo === capitulo)),
    [coincidencias, capitulo]
  );
  const indiceActivo = Math.min(activo, Math.max(resultados.length - 1, 0));
  const activa = resultados[indiceActivo];

  useEffect(() => {
    if (!activa) return;
    listaRef.current
      ?.querySelector(`[data-id="${activa.id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activa]);

  function elegir(p: PracticaCatalogo) {
    setElegida(p);
    setError(null);
    setAviso(null);
  }

  async function agregar(otra: boolean, practica = elegida) {
    if (!practica || guardando) return;
    setGuardando(true);
    setError(null);
    const piezaFinal = pieza || null;
    const err = await onAgregar(practica, piezaFinal, piezaFinal ? caras : []);
    setGuardando(false);
    if (err) {
      setError(err);
      return;
    }
    if (!otra) {
      onOpenChange(false);
      return;
    }
    // Queda abierto con la misma pieza para cargar la siguiente.
    setAviso(
      `Agregada ${practica.codigo} ${piezaFinal ? `en la pieza ${piezaFinal}` : "en boca completa"}.`
    );
    setElegida(null);
    setCaras([]);
    setQuery("");
    setActivo(0);
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActivo(Math.min(indiceActivo + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActivo(Math.max(indiceActivo - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!activa) return;
      // Primer Enter elige, el segundo (sobre la misma) agrega.
      if (elegida?.id === activa.id) void agregar(false);
      else elegir(activa);
    }
  }

  function toggleCara(c: Cara) {
    setCaras((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  let capituloAnterior = 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !guardando && onOpenChange(o)}>
      <DialogContent
        initialFocus={inputRef}
        className="flex max-h-[min(88dvh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <div className="flex flex-col gap-3 border-b border-border px-5 pt-5 pb-3">
          <div className="flex flex-col gap-0.5 pr-8">
            <DialogTitle className="text-base">Agregar práctica</DialogTitle>
            <DialogDescription>{subtitulo}</DialogDescription>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActivo(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Buscar por código (02.08) o descripción (corona)"
              autoComplete="off"
              role="combobox"
              aria-expanded
              aria-controls={listaId}
              aria-activedescendant={activa ? `${baseId}-${activa.id}` : undefined}
              aria-label="Buscar práctica"
              className="h-10 w-full min-w-0 rounded-lg border border-input bg-transparent pr-3 pl-9 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            />
          </div>
          {practicas && (
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filtrar por capítulo">
              <ChipCapitulo activo={capitulo === null} onClick={() => setCapitulo(null)}>
                Todos · {coincidencias.length}
              </ChipCapitulo>
              {Object.keys(CAPITULOS).map((k) => {
                const c = Number(k);
                const n = porCapitulo.get(c) ?? 0;
                if (n === 0 && capitulo !== c) return null;
                return (
                  <ChipCapitulo
                    key={c}
                    activo={capitulo === c}
                    onClick={() => {
                      setCapitulo(capitulo === c ? null : c);
                      setActivo(0);
                      inputRef.current?.focus();
                    }}
                  >
                    {nombreCapitulo(c)} · {n}
                  </ChipCapitulo>
                );
              })}
            </div>
          )}
        </div>

        <div
          ref={listaRef}
          id={listaId}
          role="listbox"
          aria-label="Prácticas del nomenclador"
          className="min-h-48 flex-1 overflow-y-auto px-2 pb-2"
        >
          {errorCatalogo ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
              No se pudo cargar el nomenclador.
              <Button type="button" variant="outline" size="sm" onClick={reintentar}>
                Reintentar
              </Button>
            </div>
          ) : !practicas ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cargando nomenclador...
            </div>
          ) : resultados.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Ninguna práctica coincide con &ldquo;{query.trim()}&rdquo;
              {capitulo !== null ? " en este capítulo" : ""}. Probá con parte del código (ej. 02.0) o
              una palabra de la descripción.
            </p>
          ) : (
            resultados.map((p, i) => {
              const encabezado = p.capitulo !== capituloAnterior;
              capituloAnterior = p.capitulo;
              const esElegida = elegida?.id === p.id;
              return (
                <div key={p.id}>
                  {encabezado && (
                    <div className="sticky top-0 z-10 bg-popover px-2 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                      {nombreCapitulo(p.capitulo)}
                    </div>
                  )}
                  <div
                    id={`${baseId}-${p.id}`}
                    data-id={p.id}
                    role="option"
                    aria-selected={esElegida}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setActivo(i);
                      elegir(p);
                    }}
                    onDoubleClick={() => void agregar(false, p)}
                    className={cn(
                      "grid cursor-pointer grid-cols-[1rem_4.75rem_1fr] items-baseline gap-2.5 rounded-lg px-2 py-2 text-sm",
                      i === indiceActivo && "bg-muted",
                      esElegida && "bg-primary/10"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-4 self-center rounded-full border",
                        esElegida ? "border-[5px] border-primary" : "border-input"
                      )}
                    />
                    <span className="font-mono text-xs tabular-nums">
                      <Resaltado texto={p.codigo} query={query} codigo />
                    </span>
                    <span className="min-w-0">
                      <Resaltado texto={p.descripcion} query={query} />
                      {p.subgrupo && (
                        <span className="block text-xs text-muted-foreground">{p.subgrupo}</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border bg-muted/50 px-5 py-4">
          <p
            className={cn("min-h-5 text-sm", !elegida && "text-muted-foreground")}
            aria-live="polite"
          >
            {elegida ? (
              <>
                <span className="font-mono text-xs tabular-nums">{elegida.codigo}</span>{" "}
                {elegida.descripcion}
              </>
            ) : aviso ? (
              <span className="text-emerald-700 dark:text-emerald-400">{aviso} Elegí la siguiente.</span>
            ) : (
              "Elegí una práctica de la lista."
            )}
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex w-36 flex-col gap-1.5">
              <label htmlFor={piezaId} className="text-xs font-medium text-muted-foreground">
                Pieza
              </label>
              <select
                id={piezaId}
                value={pieza}
                onChange={(e) => {
                  setPieza(e.target.value);
                  if (!e.target.value) setCaras([]);
                }}
                className={SELECT_CLASS}
              >
                <option value="">Boca completa</option>
                <optgroup label="Permanentes">
                  {PIEZAS_PERMANENTES.map((p) => (
                    <option key={p} value={String(p)}>
                      {p}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Temporales">
                  {PIEZAS_TEMPORALES.map((p) => (
                    <option key={p} value={String(p)}>
                      {p}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            {pieza && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Caras <span className="font-normal">(opcional)</span>
                </span>
                <div className="flex gap-1" role="group" aria-label="Caras">
                  {CARAS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={caras.includes(c)}
                      title={CARA_LABELS[c]}
                      onClick={() => toggleCara(c)}
                      className={cn(
                        "h-8 w-8 rounded-lg border font-mono text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                        caras.includes(c)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-muted dark:bg-input/30"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                disabled={!elegida || guardando}
                onClick={() => void agregar(true)}
              >
                Agregar y cargar otra
              </Button>
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                disabled={!elegida || guardando}
                onClick={() => void agregar(false)}
              >
                {guardando && <Loader2 className="size-4 animate-spin" />}
                Agregar
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChipCapitulo({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        activo
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
