// Formato simple del texto de una evolución: negrita, cursiva y unos pocos
// colores. Se guarda en `contenido` como texto con marcas cortas:
//
//   [b]negrita[/b]  [i]cursiva[/i]  [c=rojo]en rojo[/c]
//
// No se guarda HTML: el texto se pinta armando elementos de React (nunca
// innerHTML), así que no hay nada que sanear. Las evoluciones viejas, sin
// marcas, se ven igual que siempre. Una marca suelta o mal cerrada queda como
// texto literal. "Negro" es el color por defecto y no lleva marca.

export const COLORES_FORMATO = ["rojo", "ambar", "verde", "azul", "violeta", "gris"] as const;
export type ColorFormato = (typeof COLORES_FORMATO)[number];

export const COLOR_LABELS: Record<ColorFormato | "negro", string> = {
  negro: "Negro",
  rojo: "Rojo",
  ambar: "Ámbar",
  verde: "Verde",
  azul: "Azul",
  violeta: "Violeta",
  gris: "Gris",
};

// Tonos apagados: resaltan sin gritar, y se leen en modo oscuro.
export const COLOR_CLASES: Record<ColorFormato, string> = {
  rojo: "text-red-700 dark:text-red-400",
  ambar: "text-amber-700 dark:text-amber-400",
  verde: "text-emerald-700 dark:text-emerald-400",
  azul: "text-blue-700 dark:text-blue-400",
  violeta: "text-violet-700 dark:text-violet-400",
  gris: "text-slate-500 dark:text-slate-400",
};

export type NodoFormato =
  | string
  | { tipo: "b" | "i"; hijos: NodoFormato[] }
  | { tipo: "c"; color: ColorFormato; hijos: NodoFormato[] };

const MARCA = new RegExp(`\\[(/?)(b|i|c)(?:=(${COLORES_FORMATO.join("|")}))?\\]`, "g");

function esColor(valor: string | undefined): valor is ColorFormato {
  return (COLORES_FORMATO as readonly string[]).includes(valor ?? "");
}

type Abierto = { nodo: Exclude<NodoFormato, string>; literal: string; padre: NodoFormato[] };

function agregarTexto(destino: NodoFormato[], texto: string) {
  if (!texto) return;
  const ultimo = destino.at(-1);
  if (typeof ultimo === "string") destino[destino.length - 1] = ultimo + texto;
  else destino.push(texto);
}

export function parsearFormato(texto: string): NodoFormato[] {
  const raiz: NodoFormato[] = [];
  const pila: Abierto[] = [];
  const actual = () => (pila.length ? pila[pila.length - 1].nodo.hijos : raiz);
  let desde = 0;

  for (const m of texto.matchAll(MARCA)) {
    const [literal, cierre, tipo, color] = m;
    agregarTexto(actual(), texto.slice(desde, m.index));
    desde = m.index + literal.length;

    if (!cierre) {
      // `[c]` sin color, o `[b=rojo]`: no es una marca válida.
      if ((tipo === "c") !== esColor(color)) {
        agregarTexto(actual(), literal);
        continue;
      }
      const nodo: Exclude<NodoFormato, string> =
        tipo === "c" ? { tipo: "c", color: color as ColorFormato, hijos: [] } : { tipo: tipo as "b" | "i", hijos: [] };
      pila.push({ nodo, literal, padre: actual() });
      continue;
    }

    const tope = pila.at(-1);
    if (!tope || tope.nodo.tipo !== tipo || color) {
      agregarTexto(actual(), literal);
      continue;
    }
    pila.pop();
    if (tope.nodo.hijos.length) tope.padre.push(tope.nodo);
  }
  agregarTexto(actual(), texto.slice(desde));

  // Marcas abiertas que nunca se cerraron: vuelven a ser texto.
  while (pila.length) {
    const { nodo, literal, padre } = pila.pop()!;
    agregarTexto(padre, literal);
    for (const hijo of nodo.hijos) {
      if (typeof hijo === "string") agregarTexto(padre, hijo);
      else padre.push(hijo);
    }
  }
  return raiz;
}

function planoDe(nodos: NodoFormato[]): string {
  return nodos.map((n) => (typeof n === "string" ? n : planoDe(n.hijos))).join("");
}

// El texto sin marcas: para la IA, el historial de cambios, etc.
export function textoPlano(texto: string): string {
  return planoDe(parsearFormato(texto));
}

// Un tramo de texto con un único estilo. El editor arma la lista de tramos a
// partir de lo que ve en pantalla y `serializarTramos` la convierte en marcas
// con un anidamiento fijo (color > negrita > cursiva).
export type Tramo = { texto: string; b: boolean; i: boolean; color: ColorFormato | null };

export function serializarTramos(tramos: Tramo[]): string {
  // Une tramos vecinos con el mismo estilo.
  const unidos: Tramo[] = [];
  for (const t of tramos) {
    if (!t.texto) continue;
    const prev = unidos.at(-1);
    if (prev && prev.b === t.b && prev.i === t.i && prev.color === t.color) prev.texto += t.texto;
    else unidos.push({ ...t });
  }

  let salida = "";
  let color: ColorFormato | null = null;
  let b = false;
  let i = false;
  for (const t of unidos) {
    if (i && (!t.i || t.b !== b || t.color !== color)) {
      salida += "[/i]";
      i = false;
    }
    if (b && (!t.b || t.color !== color)) {
      salida += "[/b]";
      b = false;
    }
    if (color && t.color !== color) {
      salida += "[/c]";
      color = null;
    }
    if (t.color && !color) {
      salida += `[c=${t.color}]`;
      color = t.color;
    }
    if (t.b && !b) {
      salida += "[b]";
      b = true;
    }
    if (t.i && !i) {
      salida += "[i]";
      i = true;
    }
    salida += t.texto;
  }
  if (i) salida += "[/i]";
  if (b) salida += "[/b]";
  if (color) salida += "[/c]";
  return salida;
}

// Lo inverso: el texto con marcas como lista de tramos.
export function tramosDe(texto: string): Tramo[] {
  const tramos: Tramo[] = [];
  const recorrer = (nodos: NodoFormato[], estilo: Omit<Tramo, "texto">) => {
    for (const n of nodos) {
      if (typeof n === "string") tramos.push({ texto: n, ...estilo });
      else if (n.tipo === "c") recorrer(n.hijos, { ...estilo, color: n.color });
      else recorrer(n.hijos, { ...estilo, [n.tipo]: true });
    }
  };
  recorrer(parsearFormato(texto), { b: false, i: false, color: null });
  return tramos;
}

// ---------------------------------------------------------------------------
// Operaciones del editor, sobre posiciones del texto SIN marcas
// (`textoPlano`). Trabajar sobre el modelo en vez de usar los comandos de
// formato del navegador evita el HTML distinto que arma cada uno.

export type Formato = { tipo: "b" | "i" } | { tipo: "color"; color: ColorFormato | null };

// Corta la lista de tramos para que `inicio` y `fin` caigan en un borde.
function cortar(tramos: Tramo[], inicio: number, fin: number) {
  const antes: Tramo[] = [];
  const medio: Tramo[] = [];
  const despues: Tramo[] = [];
  let pos = 0;
  for (const t of tramos) {
    const desde = pos;
    const hasta = pos + t.texto.length;
    pos = hasta;
    const a = Math.max(desde, Math.min(inicio, hasta)) - desde;
    const b = Math.max(desde, Math.min(fin, hasta)) - desde;
    if (a > 0) antes.push({ ...t, texto: t.texto.slice(0, a) });
    if (b > a) medio.push({ ...t, texto: t.texto.slice(a, b) });
    if (t.texto.length > b) despues.push({ ...t, texto: t.texto.slice(b) });
  }
  return { antes, medio, despues };
}

// Estado del rango, para marcar los botones activos de la barra.
export function estiloEn(texto: string, inicio: number, fin: number) {
  const { medio } = cortar(tramosDe(texto), inicio, fin);
  const visibles = medio.filter((t) => t.texto.trim());
  const colores = new Set(visibles.map((t) => t.color));
  return {
    b: visibles.length > 0 && visibles.every((t) => t.b),
    i: visibles.length > 0 && visibles.every((t) => t.i),
    // `undefined` si el rango mezcla colores.
    color: colores.size === 1 ? [...colores][0] : colores.size === 0 ? null : undefined,
  };
}

// Negrita/cursiva alternan (si todo el rango ya la tiene, se quita); el color
// se pisa (`null` = negro, el color por defecto).
export function aplicarFormato(texto: string, inicio: number, fin: number, formato: Formato): string {
  if (fin <= inicio) return texto;
  const { antes, medio, despues } = cortar(tramosDe(texto), inicio, fin);
  let cambiar: (t: Tramo) => Tramo;
  if (formato.tipo === "color") {
    cambiar = (t) => ({ ...t, color: formato.color });
  } else {
    const clave = formato.tipo;
    const activo = estiloEn(texto, inicio, fin)[clave];
    cambiar = (t) => ({ ...t, [clave]: !activo });
  }
  return serializarTramos([...antes, ...medio.map(cambiar), ...despues]);
}

// Reemplaza el rango por texto sin formato (pegar).
export function reemplazarRango(texto: string, inicio: number, fin: number, nuevo: string): string {
  const { antes, despues } = cortar(tramosDe(texto), inicio, fin);
  return serializarTramos([...antes, { texto: nuevo, b: false, i: false, color: null }, ...despues]);
}
