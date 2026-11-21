import type { GrupoEspecialidad } from "@/lib/especialidad";
import type { PatientFormValues } from "./types";

// Exámenes de órgano que reemplazan al examen físico general en las
// especialidades que examinan un solo órgano (oftalmología, ORL,
// dermatología). Una misma pestaña (ExamenEspecialidadTab) y una misma
// sección de la copia de la historia clínica los dibujan a partir de esta
// configuración.

type CampoTexto = {
  [K in keyof PatientFormValues]: PatientFormValues[K] extends string ? K : never;
}[keyof PatientFormValues];

// Un dato que se mide en los dos lados (ojo u oído derecho e izquierdo).
export type FilaBilateral = {
  label: string;
  ayuda?: string;
  derecho: CampoTexto;
  izquierdo: CampoTexto;
  // Texto largo (biomicroscopía, fondo de ojo) en vez de un valor corto.
  largo?: boolean;
};

export type CampoExamen = {
  label: string;
  ayuda?: string;
  campo: CampoTexto;
  largo?: boolean;
  // Texto largo que ocupa una sola columna (de a dos por fila) en vez del
  // ancho completo.
  mitad?: boolean;
};

export type SeccionExamen = {
  titulo: string;
  // Rótulos de las dos columnas de las filas bilaterales.
  lados?: [string, string];
  bilaterales?: FilaBilateral[];
  campos?: CampoExamen[];
};

export type ExamenEspecialidad = {
  // Nombre de la pestaña y de la sección en la copia de la historia clínica.
  titulo: string;
  secciones: SeccionExamen[];
};

const OFTALMOLOGIA: ExamenEspecialidad = {
  titulo: "Examen oftalmológico",
  secciones: [
    {
      titulo: "Agudeza visual y refracción",
      lados: ["OD", "OI"],
      bilaterales: [
        { label: "AV sin corrección", ayuda: "Ej. 10/10 o 20/20", derecho: "ofAvScOd", izquierdo: "ofAvScOi" },
        { label: "AV con corrección", derecho: "ofAvCcOd", izquierdo: "ofAvCcOi" },
        { label: "Refracción", ayuda: "Esfera, cilindro y eje", derecho: "ofRefraccionOd", izquierdo: "ofRefraccionOi" },
        { label: "Presión intraocular", ayuda: "En mmHg", derecho: "ofPioOd", izquierdo: "ofPioOi" },
      ],
    },
    {
      titulo: "Biomicroscopía y fondo de ojo",
      lados: ["OD", "OI"],
      bilaterales: [
        {
          label: "Biomicroscopía",
          ayuda: "Párpados, conjuntiva, córnea, cámara anterior, iris y cristalino",
          derecho: "ofBiomicroscopiaOd",
          izquierdo: "ofBiomicroscopiaOi",
          largo: true,
        },
        {
          label: "Fondo de ojo",
          ayuda: "Papila (excavación), mácula, vasos y periferia",
          derecho: "ofFondoOjoOd",
          izquierdo: "ofFondoOjoOi",
          largo: true,
        },
      ],
    },
    {
      titulo: "Motilidad y pupilas",
      campos: [
        { label: "Motilidad ocular", ayuda: "Versiones, ducciones, cover test", campo: "ofMotilidad" },
        { label: "Pupilas", ayuda: "Tamaño, reflejos fotomotor y consensual, DPAR", campo: "ofPupilas" },
      ],
    },
  ],
};

const ORL: ExamenEspecialidad = {
  titulo: "Examen otorrinolaringológico",
  secciones: [
    {
      titulo: "Oídos",
      lados: ["OD", "OI"],
      bilaterales: [
        {
          label: "Otoscopía",
          ayuda: "Conducto, membrana timpánica, cerumen",
          derecho: "orlOtoscopiaOd",
          izquierdo: "orlOtoscopiaOi",
          largo: true,
        },
      ],
      campos: [
        { label: "Acumetría", ayuda: "Weber y Rinne", campo: "orlAcumetria" },
        {
          label: "Audiometría",
          ayuda: "Tipo y grado de hipoacusia, umbrales, logoaudiometría",
          campo: "orlAudiometria",
          largo: true,
          mitad: true,
        },
        {
          label: "Equilibrio",
          ayuda: "Nistagmo, Romberg, pruebas vestibulares",
          campo: "orlVestibular",
          largo: true,
          mitad: true,
        },
      ],
    },
    {
      titulo: "Nariz, boca, laringe y cuello",
      campos: [
        { label: "Rinoscopía", ayuda: "Tabique, cornetes, mucosa, secreciones", campo: "orlRinoscopia", largo: true },
        { label: "Orofaringe", ayuda: "Amígdalas (grado), paladar, úvula", campo: "orlOrofaringe", largo: true },
        { label: "Laringoscopía", ayuda: "Cuerdas vocales: movilidad, lesiones, cierre glótico", campo: "orlLaringoscopia", largo: true },
        { label: "Cuello", ayuda: "Adenopatías, tiroides, masas", campo: "orlCuello", largo: true },
      ],
    },
  ],
};

const DERMATOLOGIA: ExamenEspecialidad = {
  titulo: "Examen dermatológico",
  secciones: [
    {
      titulo: "Lesiones",
      campos: [
        { label: "Fototipo", ayuda: "I a VI (Fitzpatrick)", campo: "dermFototipo" },
        {
          label: "Lesión elemental",
          ayuda: "Mácula, pápula, placa, nódulo, vesícula, pústula, costra, úlcera...",
          campo: "dermLesiones",
        },
        { label: "Localización y distribución", ayuda: "Zonas afectadas; simétrica, localizada o generalizada", campo: "dermLocalizacion", largo: true },
        { label: "Descripción", ayuda: "Color, tamaño, forma, bordes, superficie, número", campo: "dermDescripcion", largo: true },
        { label: "Dermatoscopía", ayuda: "Patrón y estructuras (regla ABCD si es un nevo)", campo: "dermDermatoscopia", largo: true },
      ],
    },
    {
      titulo: "Anexos y mucosas",
      campos: [
        { label: "Faneras", ayuda: "Pelo y uñas", campo: "dermFaneras", largo: true },
        { label: "Mucosas", campo: "dermMucosas", largo: true },
      ],
    },
  ],
};

const EXAMENES: Partial<Record<GrupoEspecialidad, ExamenEspecialidad>> = {
  OFTALMOLOGICA: OFTALMOLOGIA,
  ORL,
  DERMATOLOGICA: DERMATOLOGIA,
};

export function examenEspecialidad(grupo: GrupoEspecialidad): ExamenEspecialidad | null {
  return EXAMENES[grupo] ?? null;
}

// Todos los exámenes, para mostrar lo cargado aunque el profesional haya
// cambiado de especialidad.
export const EXAMENES_ESPECIALIDAD: readonly ExamenEspecialidad[] = [OFTALMOLOGIA, ORL, DERMATOLOGIA];

// Lo cargado de un examen como pares rótulo/valor para la copia de la
// historia clínica. Las filas bilaterales van como "OD: … · OI: …".
export function datosExamen(
  examen: ExamenEspecialidad,
  // El paciente de Prisma o los valores del formulario: solo se leen los
  // campos del examen.
  p: object
): { label: string; value: string }[] {
  const texto = (campo: CampoTexto) => {
    const v = (p as Record<string, unknown>)[campo];
    return typeof v === "string" ? v.trim() : "";
  };
  const datos: { label: string; value: string }[] = [];
  for (const seccion of examen.secciones) {
    const [ladoD, ladoI] = seccion.lados ?? ["D", "I"];
    for (const fila of seccion.bilaterales ?? []) {
      const d = texto(fila.derecho);
      const i = texto(fila.izquierdo);
      if (!d && !i) continue;
      datos.push({ label: fila.label, value: [d && `${ladoD}: ${d}`, i && `${ladoI}: ${i}`].filter(Boolean).join(" · ") });
    }
    for (const c of seccion.campos ?? []) {
      const v = texto(c.campo);
      if (v) datos.push({ label: c.label, value: v });
    }
  }
  return datos;
}
