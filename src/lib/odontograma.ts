import { z } from "zod";

// Odontograma: tipos, códigos de la referencia de la ficha odontológica y
// helpers puros. Se usa tanto en el cliente (editor) como en la API
// (validación de `PatientOdontograma.datos`), así que no importa nada de
// servidor.

// ---------------------------------------------------------------------------
// Piezas (notación FDI), en el orden en que se dibujan en la ficha: de
// izquierda a derecha visto de frente, la derecha del paciente a la izquierda.
// ---------------------------------------------------------------------------

export const ARCADAS = {
  permanente: {
    superior: [
      [18, 17, 16, 15, 14, 13, 12, 11],
      [21, 22, 23, 24, 25, 26, 27, 28],
    ],
    inferior: [
      [48, 47, 46, 45, 44, 43, 42, 41],
      [31, 32, 33, 34, 35, 36, 37, 38],
    ],
  },
  temporal: {
    superior: [
      [55, 54, 53, 52, 51],
      [61, 62, 63, 64, 65],
    ],
    inferior: [
      [85, 84, 83, 82, 81],
      [71, 72, 73, 74, 75],
    ],
  },
} as const;

const PIEZAS_PERMANENTES: readonly number[] = [
  ...ARCADAS.permanente.superior.flat(),
  ...ARCADAS.permanente.inferior.flat(),
];
const PIEZAS_TEMPORALES: readonly number[] = [
  ...ARCADAS.temporal.superior.flat(),
  ...ARCADAS.temporal.inferior.flat(),
];
export const PIEZAS_VALIDAS: ReadonlySet<string> = new Set(
  [...PIEZAS_PERMANENTES, ...PIEZAS_TEMPORALES].map(String)
);

// Orden de la ficha (permanente sup, permanente inf, temporal sup, temporal
// inf) -- para listar el plan de tratamiento en un orden predecible.
const ORDEN_PIEZA = new Map(
  [...PIEZAS_PERMANENTES, ...PIEZAS_TEMPORALES].map((p, i) => [String(p), i])
);

function cuadrante(pieza: number | string) {
  return Math.floor(Number(pieza) / 10);
}

export function esSuperior(pieza: number | string) {
  return [1, 2, 5, 6].includes(cuadrante(pieza));
}

// Cuadrantes que se dibujan a la izquierda de la línea media (derecha del
// paciente): ahí la cara mesial (hacia la línea media) queda a la derecha.
export function mesialALaDerecha(pieza: number | string) {
  return [1, 4, 5, 8].includes(cuadrante(pieza));
}

// ---------------------------------------------------------------------------
// Caras y códigos
// ---------------------------------------------------------------------------

export const CARAS = ["O", "V", "L", "M", "D"] as const;
export type Cara = (typeof CARAS)[number];

export const CARA_LABELS: Record<Cara, string> = {
  O: "oclusal / incisal",
  V: "vestibular",
  L: "lingual / palatina",
  M: "mesial",
  D: "distal",
};

// Códigos que se marcan sobre una cara puntual.
export const CODIGOS_CARA = [
  "CARIES",
  "OBT_COMPOSITE",
  "OBT_AMALGAMA",
  "OBT_SILICATO",
  "INCRUSTACION",
] as const;

// Códigos que aplican a la pieza completa.
export const CODIGOS_PIEZA = [
  "AUSENTE",
  "EXTRACCION",
  "CORONA",
  "TRAT_CONDUCTO",
  "PERNO",
  "IMPLANTE",
  "PUENTE",
  "PROTESIS_REMOVIBLE",
  "ORTODONCIA",
  "PARADENTOSIS",
  "CARIES_INCURABLE",
] as const;

export type CodigoCara = (typeof CODIGOS_CARA)[number];
export type CodigoPieza = (typeof CODIGOS_PIEZA)[number];
export type CodigoOdonto = CodigoCara | CodigoPieza;

const CODIGOS_CARA_SET: ReadonlySet<string> = new Set(CODIGOS_CARA);
export function esCodigoDeCara(codigo: CodigoOdonto): codigo is CodigoCara {
  return CODIGOS_CARA_SET.has(codigo);
}

// `simbolo` es la abreviatura de la referencia de la ficha en papel; los que
// tienen `abrev` se escriben como texto debajo de la pieza en el SVG (el
// resto se dibuja con un trazo: X, =, círculo, etc.).
export const CODIGO_INFO: Record<CodigoOdonto, { label: string; simbolo: string; abrev?: string }> = {
  CARIES: { label: "Caries", simbolo: "○" },
  OBT_COMPOSITE: { label: "Obt. composite", simbolo: "/Ac" },
  OBT_AMALGAMA: { label: "Obt. amalgama", simbolo: "/A" },
  OBT_SILICATO: { label: "Obt. silicato", simbolo: "/S" },
  INCRUSTACION: { label: "Incrustación", simbolo: "I" },
  AUSENTE: { label: "Diente ausente", simbolo: "X" },
  EXTRACCION: { label: "Extracción", simbolo: "=" },
  CORONA: { label: "Corona", simbolo: "O" },
  TRAT_CONDUCTO: { label: "Trat. de conducto", simbolo: "TC", abrev: "TC" },
  PERNO: { label: "Pivot / perno", simbolo: "P", abrev: "P" },
  IMPLANTE: { label: "Implante", simbolo: "IM", abrev: "IM" },
  PUENTE: { label: "Puente", simbolo: "⊓" },
  PROTESIS_REMOVIBLE: { label: "Prót. removible", simbolo: "PR", abrev: "PR" },
  ORTODONCIA: { label: "Ortodoncia", simbolo: "/\\/\\" },
  PARADENTOSIS: { label: "Paradentosis", simbolo: "Pd", abrev: "Pd" },
  CARIES_INCURABLE: { label: "Caries incurable", simbolo: "■" },
};

// ---------------------------------------------------------------------------
// Datos
// ---------------------------------------------------------------------------

export const TIPOS_MARCA = ["existente", "requerida"] as const;
export type TipoMarca = (typeof TIPOS_MARCA)[number];

export const TIPO_MARCA_LABELS: Record<TipoMarca, string> = {
  existente: "Prestación existente",
  requerida: "Prestación requerida",
};

export type Marca<C extends CodigoOdonto = CodigoOdonto> = { codigo: C; tipo: TipoMarca };

export type EstadoPieza = {
  pieza?: Marca<CodigoPieza>[];
  caras?: Partial<Record<Cara, Marca<CodigoCara>>>;
};

export type DatosOdontograma = {
  version: 1;
  piezas: Record<string, EstadoPieza>;
};

export const ODONTOGRAMA_TIPOS = ["INICIAL", "CONTROL"] as const;
export type OdontogramaTipo = (typeof ODONTOGRAMA_TIPOS)[number];

const marcaPiezaSchema = z.object({
  codigo: z.enum(CODIGOS_PIEZA),
  tipo: z.enum(TIPOS_MARCA),
});
const marcaCaraSchema = z.object({
  codigo: z.enum(CODIGOS_CARA),
  tipo: z.enum(TIPOS_MARCA),
});

export const datosOdontogramaSchema = z.object({
  version: z.literal(1),
  piezas: z
    .record(
      z.string().refine((p) => PIEZAS_VALIDAS.has(p), "Pieza dental inválida."),
      z.object({
        pieza: z.array(marcaPiezaSchema).max(CODIGOS_PIEZA.length).optional(),
        caras: z.partialRecord(z.enum(CARAS), marcaCaraSchema).optional(),
      })
    )
    .transform((piezas) => normalizarPiezas(piezas as Record<string, EstadoPieza>)),
});

export const odontogramaInputSchema = z.object({
  tipo: z.enum(ODONTOGRAMA_TIPOS),
  fecha: z.string().trim().min(1, "La fecha es obligatoria."),
  nota: z
    .string()
    .trim()
    .max(5000)
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  datos: datosOdontogramaSchema,
});

export type OdontogramaInput = z.infer<typeof odontogramaInputSchema>;

export function datosVacios(): DatosOdontograma {
  return { version: 1, piezas: {} };
}

// Saca piezas sin marcas y duplicados, para que lo que se guarda y lo que se
// compara (diff) sea siempre la forma mínima.
function normalizarPiezas(piezas: Record<string, EstadoPieza>): Record<string, EstadoPieza> {
  const out: Record<string, EstadoPieza> = {};
  for (const [num, estado] of Object.entries(piezas)) {
    const vistos = new Set<string>();
    const pieza = (estado.pieza ?? []).filter((m) => {
      if (vistos.has(m.codigo)) return false;
      vistos.add(m.codigo);
      return true;
    });
    const caras = Object.fromEntries(
      Object.entries(estado.caras ?? {}).filter(([, m]) => m != null)
    ) as EstadoPieza["caras"];
    const limpio: EstadoPieza = {};
    if (pieza.length > 0) limpio.pieza = pieza;
    if (caras && Object.keys(caras).length > 0) limpio.caras = caras;
    if (limpio.pieza || limpio.caras) out[num] = limpio;
  }
  return out;
}

// Lo que viene de la DB es `Json`: si por algún motivo no tiene la forma
// esperada, se arranca de cero en vez de romper el editor.
export function parseDatos(raw: unknown): DatosOdontograma {
  const parsed = datosOdontogramaSchema.safeParse(raw);
  return parsed.success ? parsed.data : datosVacios();
}

export function tieneMarcas(datos: DatosOdontograma) {
  return Object.keys(normalizarPiezas(datos.piezas)).length > 0;
}

// ---------------------------------------------------------------------------
// Edición (inmutable)
// ---------------------------------------------------------------------------

function conPieza(datos: DatosOdontograma, pieza: string, estado: EstadoPieza): DatosOdontograma {
  return { ...datos, piezas: normalizarPiezas({ ...datos.piezas, [pieza]: estado }) };
}

// Misma marca (código + tipo) en la misma cara -> la saca; si no, la pone
// (reemplazando lo que hubiera en esa cara).
export function toggleMarcaCara(
  datos: DatosOdontograma,
  pieza: string,
  cara: Cara,
  marca: Marca<CodigoCara>
): DatosOdontograma {
  const estado = datos.piezas[pieza] ?? {};
  const actual = estado.caras?.[cara];
  const igual = actual && actual.codigo === marca.codigo && actual.tipo === marca.tipo;
  return conPieza(datos, pieza, {
    ...estado,
    caras: { ...estado.caras, [cara]: igual ? undefined : marca },
  });
}

// Mismo código ya puesto en la pieza: si es el mismo tipo lo saca, si no le
// cambia el tipo (ej: requerida -> existente cuando se hizo el tratamiento).
export function toggleMarcaPieza(
  datos: DatosOdontograma,
  pieza: string,
  marca: Marca<CodigoPieza>
): DatosOdontograma {
  const estado = datos.piezas[pieza] ?? {};
  const marcas = estado.pieza ?? [];
  const actual = marcas.find((m) => m.codigo === marca.codigo);
  const siguientes = !actual
    ? [...marcas, marca]
    : actual.tipo === marca.tipo
      ? marcas.filter((m) => m.codigo !== marca.codigo)
      : marcas.map((m) => (m.codigo === marca.codigo ? marca : m));
  return conPieza(datos, pieza, { ...estado, pieza: siguientes });
}

export function borrarCara(datos: DatosOdontograma, pieza: string, cara: Cara): DatosOdontograma {
  const estado = datos.piezas[pieza] ?? {};
  return conPieza(datos, pieza, { ...estado, caras: { ...estado.caras, [cara]: undefined } });
}

export function borrarPieza(datos: DatosOdontograma, pieza: string): DatosOdontograma {
  return conPieza(datos, pieza, {});
}

export type ItemPlan = {
  pieza: string;
  cara?: Cara;
  codigo: CodigoOdonto;
};

// Pasa una prestación requerida a existente (se hizo el tratamiento).
export function marcarRealizada(datos: DatosOdontograma, item: ItemPlan): DatosOdontograma {
  const estado = datos.piezas[item.pieza];
  if (!estado) return datos;
  if (item.cara) {
    const actual = estado.caras?.[item.cara];
    if (!actual) return datos;
    return conPieza(datos, item.pieza, {
      ...estado,
      caras: { ...estado.caras, [item.cara]: { ...actual, tipo: "existente" } },
    });
  }
  return conPieza(datos, item.pieza, {
    ...estado,
    pieza: (estado.pieza ?? []).map((m) =>
      m.codigo === item.codigo ? { ...m, tipo: "existente" as const } : m
    ),
  });
}

// ---------------------------------------------------------------------------
// Derivados
// ---------------------------------------------------------------------------

// Prestaciones requeridas (azul), en el orden de la ficha.
export function planDeTratamiento(datos: DatosOdontograma): ItemPlan[] {
  const items: ItemPlan[] = [];
  const piezas = Object.keys(datos.piezas).sort(
    (a, b) => (ORDEN_PIEZA.get(a) ?? 0) - (ORDEN_PIEZA.get(b) ?? 0)
  );
  for (const pieza of piezas) {
    const estado = datos.piezas[pieza];
    for (const m of estado.pieza ?? []) {
      if (m.tipo === "requerida") items.push({ pieza, codigo: m.codigo });
    }
    for (const cara of CARAS) {
      const m = estado.caras?.[cara];
      if (m?.tipo === "requerida") items.push({ pieza, cara, codigo: m.codigo });
    }
  }
  return items;
}

const AUSENCIA: ReadonlySet<CodigoOdonto> = new Set(["AUSENTE", "EXTRACCION"]);

// Piezas permanentes presentes: 32 menos las marcadas como ausentes o ya
// extraídas (en rojo -- una extracción requerida todavía está en boca).
export function contarDientesExistentes(datos: DatosOdontograma): number {
  let ausentes = 0;
  for (const pieza of PIEZAS_PERMANENTES) {
    const marcas = datos.piezas[String(pieza)]?.pieza ?? [];
    if (marcas.some((m) => AUSENCIA.has(m.codigo) && m.tipo === "existente")) ausentes++;
  }
  return PIEZAS_PERMANENTES.length - ausentes;
}

function claveEstado(estado: EstadoPieza | undefined): string {
  if (!estado) return "";
  const pieza = [...(estado.pieza ?? [])]
    .map((m) => `${m.codigo}:${m.tipo}`)
    .sort()
    .join(",");
  const caras = CARAS.map((c) => {
    const m = estado.caras?.[c];
    return m ? `${c}=${m.codigo}:${m.tipo}` : "";
  }).join("|");
  return `${pieza}#${caras}`;
}

// Piezas cuyo estado cambió entre dos snapshots.
export function diffOdontograma(antes: DatosOdontograma, despues: DatosOdontograma): Set<string> {
  const cambiadas = new Set<string>();
  const todas = new Set([...Object.keys(antes.piezas), ...Object.keys(despues.piezas)]);
  for (const pieza of todas) {
    if (claveEstado(antes.piezas[pieza]) !== claveEstado(despues.piezas[pieza])) {
      cambiadas.add(pieza);
    }
  }
  return cambiadas;
}

export function describirItem(item: ItemPlan): string {
  const base = `${item.pieza} · ${CODIGO_INFO[item.codigo].label}`;
  return item.cara ? `${base} (${CARA_LABELS[item.cara]})` : base;
}
