"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Bold, Italic } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COLOR_CLASES,
  COLOR_LABELS,
  COLORES_FORMATO,
  aplicarFormato,
  estiloEn,
  reemplazarRango,
  serializarTramos,
  textoPlano,
  tramosDe,
  type ColorFormato,
  type Formato,
  type Tramo,
} from "@/lib/evolucion-formato";

// Editor de texto con negrita, cursiva y color (ver `evolucion-formato.ts`).
// El formato se aplica desde una barra flotante que aparece al seleccionar
// texto, o con Ctrl+B / Ctrl+I. El valor es el texto con marcas; el DOM del
// editor se arma a partir de él y se vuelve a leer en cada cambio.

const FONDO_COLOR: Record<ColorFormato | "negro", string> = {
  negro: "bg-foreground",
  rojo: "bg-red-700 dark:bg-red-400",
  ambar: "bg-amber-700 dark:bg-amber-400",
  verde: "bg-emerald-700 dark:bg-emerald-400",
  azul: "bg-blue-700 dark:bg-blue-400",
  violeta: "bg-violet-700 dark:bg-violet-400",
  gris: "bg-slate-500 dark:bg-slate-400",
};

// --- DOM <-> texto con marcas ----------------------------------------------

function construir(el: HTMLElement, texto: string) {
  const frag = document.createDocumentFragment();
  for (const t of tramosDe(texto)) {
    let destino: Node = frag;
    const envolver = (nodo: HTMLElement) => {
      destino.appendChild(nodo);
      destino = nodo;
    };
    if (t.color) {
      const span = document.createElement("span");
      span.dataset.c = t.color;
      span.className = COLOR_CLASES[t.color];
      envolver(span);
    }
    if (t.b) envolver(document.createElement("strong"));
    if (t.i) envolver(document.createElement("em"));
    t.texto.split("\n").forEach((linea, k) => {
      if (k > 0) destino.appendChild(document.createElement("br"));
      if (linea) destino.appendChild(document.createTextNode(linea));
    });
  }
  // Un <br> final no se ve: hace falta uno de relleno para mostrar la línea vacía.
  if (textoPlano(texto).endsWith("\n")) frag.appendChild(document.createElement("br"));
  el.replaceChildren(frag);
}

function ultimaHoja(el: Node): Node | null {
  let nodo = el.lastChild;
  while (nodo) {
    if (nodo.nodeType === Node.TEXT_NODE && !nodo.textContent) {
      nodo = nodo.previousSibling;
      continue;
    }
    if (!nodo.lastChild) return nodo;
    nodo = nodo.lastChild;
  }
  return null;
}

function estiloDe(el: HTMLElement, base: Omit<Tramo, "texto">): Omit<Tramo, "texto"> {
  const estilo = { ...base };
  const tag = el.tagName;
  if (tag === "B" || tag === "STRONG") estilo.b = true;
  if (tag === "I" || tag === "EM") estilo.i = true;
  const peso = el.style.fontWeight;
  if (peso === "bold" || Number(peso) >= 600) estilo.b = true;
  if (el.style.fontStyle === "italic") estilo.i = true;
  const color = el.dataset.c;
  if (color && (COLORES_FORMATO as readonly string[]).includes(color)) estilo.color = color as ColorFormato;
  return estilo;
}

function leer(root: HTMLElement): string {
  const tramos: Tramo[] = [];
  const relleno = ultimaHoja(root);
  const visitar = (nodo: Node, estilo: Omit<Tramo, "texto">) => {
    nodo.childNodes.forEach((hijo) => {
      if (hijo.nodeType === Node.TEXT_NODE) {
        tramos.push({ texto: hijo.textContent ?? "", ...estilo });
        return;
      }
      if (!(hijo instanceof HTMLElement)) return;
      if (hijo.tagName === "BR") {
        if (hijo !== relleno) tramos.push({ texto: "\n", ...estilo });
        return;
      }
      // Bloques (algunos navegadores los arman al pegar o con Enter).
      const bloque = hijo.tagName === "DIV" || hijo.tagName === "P";
      const previo = tramos.at(-1);
      if (bloque && previo && !previo.texto.endsWith("\n")) {
        tramos.push({ texto: "\n", b: false, i: false, color: null });
      }
      visitar(hijo, estiloDe(hijo, estilo));
    });
  };
  visitar(root, { b: false, i: false, color: null });
  return serializarTramos(tramos);
}

// --- Selección como posiciones en el texto sin marcas ------------------------

function contar(nodo: Node): number {
  let total = 0;
  nodo.childNodes.forEach((hijo) => {
    if (hijo.nodeType === Node.TEXT_NODE) total += hijo.textContent?.length ?? 0;
    else if (hijo.nodeName === "BR") total += 1;
    else total += contar(hijo);
  });
  return total;
}

function posicionDe(root: HTMLElement, nodo: Node, offset: number): number {
  const rango = document.createRange();
  rango.setStart(root, 0);
  rango.setEnd(nodo, offset);
  return contar(rango.cloneContents());
}

function seleccionDe(root: HTMLElement): { inicio: number; fin: number } | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const rango = sel.getRangeAt(0);
  if (!root.contains(rango.startContainer) || !root.contains(rango.endContainer)) return null;
  return {
    inicio: posicionDe(root, rango.startContainer, rango.startOffset),
    fin: posicionDe(root, rango.endContainer, rango.endOffset),
  };
}

function ubicar(root: HTMLElement, posicion: number): [Node, number] {
  let resto = posicion;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let nodo = walker.nextNode();
  while (nodo) {
    if (nodo.nodeType === Node.TEXT_NODE) {
      const largo = nodo.textContent?.length ?? 0;
      if (resto <= largo) return [nodo, resto];
      resto -= largo;
    } else if (nodo.nodeName === "BR") {
      if (resto === 0) return [nodo.parentNode!, Array.from(nodo.parentNode!.childNodes).indexOf(nodo as ChildNode)];
      resto -= 1;
    }
    nodo = walker.nextNode();
  }
  return [root, root.childNodes.length];
}

function seleccionar(root: HTMLElement, inicio: number, fin: number) {
  const sel = window.getSelection();
  if (!sel) return;
  const rango = document.createRange();
  rango.setStart(...ubicar(root, inicio));
  rango.setEnd(...ubicar(root, fin));
  sel.removeAllRanges();
  sel.addRange(rango);
}

// --- Componente --------------------------------------------------------------

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  "aria-label"?: string;
};

type Barra = { left: number; top: number; abajo: boolean };
type Estilo = ReturnType<typeof estiloEn>;

export function EditorConFormato({
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  ref,
  "aria-label": ariaLabel,
}: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Último valor que salió del editor: si `value` vuelve igual, el DOM ya lo
  // refleja y no hay que rearmarlo (se perdería el cursor).
  const emitido = useRef<string | null>(null);
  const [barra, setBarra] = useState<Barra | null>(null);
  const [estilo, setEstilo] = useState<Estilo>({ b: false, i: false, color: null });

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      editorRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref]
  );

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el || value === emitido.current) return;
    construir(el, value);
    emitido.current = value;
  }, [value]);

  const actualizarBarra = useCallback(() => {
    const el = editorRef.current;
    const wrap = wrapRef.current;
    const sel = window.getSelection();
    if (
      !el ||
      !wrap ||
      !sel ||
      sel.rangeCount === 0 ||
      sel.isCollapsed ||
      document.activeElement !== el ||
      !el.contains(sel.anchorNode)
    ) {
      setBarra(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const caja = el.getBoundingClientRect();
    // La selección quedó fuera de la parte visible (el editor scrollea).
    if (rect.bottom < caja.top || rect.top > caja.bottom) {
      setBarra(null);
      return;
    }
    const w = wrap.getBoundingClientRect();
    const s = seleccionDe(el);
    if (s) setEstilo(estiloEn(leer(el), Math.min(s.inicio, s.fin), Math.max(s.inicio, s.fin)));
    // En pantallas táctiles el menú nativo de copiar/pegar va arriba de la
    // selección: la barra se muestra abajo.
    const abajo = window.matchMedia("(pointer: coarse)").matches;
    const mitad = 136;
    const centro = rect.left + rect.width / 2 - w.left;
    setBarra({
      left: w.width < mitad * 2 ? w.width / 2 : Math.min(Math.max(centro, mitad), w.width - mitad),
      top: abajo ? rect.bottom - w.top + 8 : rect.top - w.top - 8,
      abajo,
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", actualizarBarra);
    return () => document.removeEventListener("selectionchange", actualizarBarra);
  }, [actualizarBarra]);

  // Los comandos de formato propios del navegador (menú contextual, atajos
  // de algunos sistemas) arman HTML que no es nuestro formato.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const bloquear = (e: InputEvent) => {
      if (e.inputType.startsWith("format")) e.preventDefault();
    };
    el.addEventListener("beforeinput", bloquear);
    return () => el.removeEventListener("beforeinput", bloquear);
  }, []);

  function emitir() {
    const el = editorRef.current;
    if (!el) return;
    const nuevo = leer(el);
    emitido.current = nuevo;
    onChange(nuevo);
  }

  // Cambio hecho sobre el modelo: se rearma el DOM y se repone la selección.
  function aplicar(nuevo: string, inicio: number, fin: number) {
    const el = editorRef.current;
    if (!el) return;
    construir(el, nuevo);
    emitido.current = nuevo;
    onChange(nuevo);
    seleccionar(el, inicio, fin);
    actualizarBarra();
  }

  function formatear(formato: Formato) {
    const el = editorRef.current;
    const s = el && seleccionDe(el);
    if (!el || !s || s.inicio === s.fin) return;
    const inicio = Math.min(s.inicio, s.fin);
    const fin = Math.max(s.inicio, s.fin);
    aplicar(aplicarFormato(leer(el), inicio, fin, formato), inicio, fin);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      // Un <br> en vez del <div> que arman algunos navegadores; así queda
      // también en el historial de deshacer.
      if (!document.execCommand("insertLineBreak")) pegar("\n");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      const tecla = e.key.toLowerCase();
      if (tecla === "b" || tecla === "i") {
        e.preventDefault();
        formatear({ tipo: tecla });
      }
    }
  }

  function pegar(texto: string) {
    const el = editorRef.current;
    const s = el && seleccionDe(el);
    if (!el || !s) return;
    const inicio = Math.min(s.inicio, s.fin);
    const fin = Math.max(s.inicio, s.fin);
    const pos = inicio + texto.length;
    aplicar(reemplazarRango(leer(el), inicio, fin, texto), pos, pos);
  }

  const vacio = !textoPlano(value).trim() && !value.includes("\n");

  return (
    <div ref={wrapRef} className="relative">
      <div
        ref={setRefs}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        contentEditable={!disabled}
        spellCheck
        onInput={emitir}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          e.preventDefault();
          pegar(e.clipboardData.getData("text/plain").replace(/\r\n?/g, "\n"));
        }}
        onDrop={(e) => e.preventDefault()}
        onBlur={() => setBarra(null)}
        onScroll={actualizarBarra}
        className={cn(
          "w-full whitespace-pre-wrap break-words rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 md:text-sm dark:bg-input/30",
          disabled && "cursor-not-allowed bg-input/50 opacity-50 dark:bg-input/80",
          className
        )}
      />
      {vacio && placeholder && (
        <span className="pointer-events-none absolute top-2 left-2.5 text-base text-muted-foreground md:text-sm">
          {placeholder}
        </span>
      )}

      {barra && !disabled && (
        <div
          role="toolbar"
          aria-label="Formato del texto"
          // No sacar el foco ni la selección del editor al tocar la barra.
          onMouseDown={(e) => e.preventDefault()}
          style={{ left: barra.left, top: barra.top }}
          className={cn(
            "absolute z-50 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
            !barra.abajo && "-translate-y-full"
          )}
        >
          <BotonFormato activo={estilo.b} label="Negrita (Ctrl+B)" onClick={() => formatear({ tipo: "b" })}>
            <Bold className="size-4" />
          </BotonFormato>
          <BotonFormato activo={estilo.i} label="Cursiva (Ctrl+I)" onClick={() => formatear({ tipo: "i" })}>
            <Italic className="size-4" />
          </BotonFormato>
          <span className="mx-1 h-5 w-px bg-border" />
          {(["negro", ...COLORES_FORMATO] as const).map((c) => {
            const color = c === "negro" ? null : c;
            const label = c === "negro" ? `${COLOR_LABELS.negro} (predeterminado)` : COLOR_LABELS[c];
            return (
              <button
                key={c}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={estilo.color === color}
                onClick={() => formatear({ tipo: "color", color })}
                className="grid size-7 place-items-center rounded-md hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "size-4 rounded-full",
                    FONDO_COLOR[c],
                    estilo.color === color && "ring-2 ring-ring ring-offset-2 ring-offset-popover"
                  )}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BotonFormato({
  activo,
  label,
  onClick,
  children,
}: {
  activo: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "grid size-7 place-items-center rounded-md hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        activo && "bg-primary/10 text-primary"
      )}
    >
      {children}
    </button>
  );
}
