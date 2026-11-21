import type { GrupoEspecialidad } from "@/lib/especialidad";

export const ANTECEDENTES_COLUMNA_1 = [
  { tipo: "DISLIPEMIA", label: "Displemia" },
  { tipo: "HIPOTIROIDISMO", label: "Hipotiroidismo" },
  { tipo: "HIPERTIROIDISMO", label: "Hipertiroidismo" },
  { tipo: "ARTRITIS", label: "Artritis" },
  { tipo: "DIABETES", label: "Diabetes" },
  { tipo: "ALERGIA", label: "Alergia" },
  { tipo: "NEOPLASIAS", label: "Neoplasias" },
  { tipo: "ARRITMIAS", label: "Arritmias" },
  { tipo: "HTA", label: "HTA" },
  { tipo: "ARTROSIS", label: "Artrosis" },
] as const;

export const ANTECEDENTES_COLUMNA_2 = [
  { tipo: "ALCOHOLISMO", label: "Alcoholismo" },
  { tipo: "PSIQUIATRICAS", label: "Psiquiátricas" },
  { tipo: "INFECCIOSAS", label: "Infecciosas" },
  { tipo: "PROSTATA", label: "Próstata" },
  { tipo: "NOD_MAMAS", label: "Nod. mamas" },
  { tipo: "EPOC", label: "EPOC" },
  { tipo: "CARDIOPATIAS", label: "Cardiopatías" },
  { tipo: "NEUROLOGICAS", label: "Neurológicas" },
  { tipo: "ASMA", label: "Asma" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_ORDEN = [
  ...ANTECEDENTES_COLUMNA_1,
  ...ANTECEDENTES_COLUMNA_2,
];

export const ESTADO_CIVIL_OPTIONS = [
  { value: "SOLTERO", label: "Soltero" },
  { value: "CASADO", label: "Casado" },
  { value: "VIUDO", label: "Viudo" },
  { value: "CONCUBINO", label: "Concubino" },
] as const;

// Historia clínica de psicología (ver esPsicologia()): el checklist médico
// (dislipemia, próstata, EPOC...) no le sirve a un psicólogo. Comparte el
// enum TipoAntecedente con el médico; "Otros" está en las dos listas.
export const ANTECEDENTES_PSICOLOGIA_COLUMNA_1 = [
  { tipo: "TRATAMIENTO_PSICOLOGICO_PREVIO", label: "Tratamiento psicológico previo" },
  { tipo: "TRATAMIENTO_PSIQUIATRICO_PREVIO", label: "Tratamiento psiquiátrico previo" },
  { tipo: "MEDICACION_PSIQUIATRICA", label: "Medicación psiquiátrica" },
  { tipo: "INTERNACIONES_PSIQUIATRICAS", label: "Internaciones" },
  { tipo: "CONSUMO_SUSTANCIAS", label: "Consumo de sustancias" },
  { tipo: "ENFERMEDADES_MEDICAS", label: "Enfermedades médicas" },
] as const;

export const ANTECEDENTES_PSICOLOGIA_COLUMNA_2 = [
  { tipo: "AUTOLESIONES", label: "Autolesiones" },
  { tipo: "INTENTOS_SUICIDIO", label: "Intentos de suicidio" },
  { tipo: "SALUD_MENTAL_FAMILIAR", label: "Salud mental familiar" },
  { tipo: "SITUACIONES_TRAUMATICAS", label: "Situaciones traumáticas" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_PSICOLOGIA_ORDEN = [
  ...ANTECEDENTES_PSICOLOGIA_COLUMNA_1,
  ...ANTECEDENTES_PSICOLOGIA_COLUMNA_2,
];

// Historia clínica odontológica (ver esOdontologica()): lo que importa antes
// de anestesiar, extraer o indicar un antibiótico. Reusa del enum los
// antecedentes médicos que también le sirven al odontólogo.
export const ANTECEDENTES_ODONTOLOGIA_COLUMNA_1 = [
  { tipo: "ALERGIA_ANESTESICOS", label: "Alergia a anestésicos locales" },
  { tipo: "ALERGIA_ANTIBIOTICOS", label: "Alergia a antibióticos" },
  { tipo: "ALERGIA_LATEX", label: "Alergia al látex" },
  { tipo: "ALERGIA", label: "Otras alergias" },
  { tipo: "ANTICOAGULANTES", label: "Anticoagulantes o antiagregantes" },
  { tipo: "BIFOSFONATOS", label: "Bifosfonatos" },
  { tipo: "TRASTORNOS_COAGULACION", label: "Trastornos de la coagulación" },
  { tipo: "ENDOCARDITIS_RIESGO", label: "Riesgo de endocarditis" },
  { tipo: "EMBARAZO", label: "Embarazo" },
] as const;

export const ANTECEDENTES_ODONTOLOGIA_COLUMNA_2 = [
  { tipo: "DIABETES", label: "Diabetes" },
  { tipo: "HTA", label: "Hipertensión" },
  { tipo: "CARDIOPATIAS", label: "Cardiopatías" },
  { tipo: "ASMA", label: "Asma" },
  { tipo: "INFECCIOSAS", label: "Infecciosas (HIV, hepatitis)" },
  { tipo: "RADIOTERAPIA_CABEZA_CUELLO", label: "Radioterapia de cabeza y cuello" },
  { tipo: "BRUXISMO", label: "Bruxismo" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_ODONTOLOGIA_ORDEN = [
  ...ANTECEDENTES_ODONTOLOGIA_COLUMNA_1,
  ...ANTECEDENTES_ODONTOLOGIA_COLUMNA_2,
];

// Historia clínica de fonoaudiología (ver esFonoaudiologia()): audición,
// desarrollo del lenguaje, funciones orofaciales y voz. Muchos pacientes son
// chicos, así que entran los perinatales y los hábitos orales. Reusa del enum
// NEUROLOGICAS y ENFERMEDADES_MEDICAS.
export const ANTECEDENTES_FONOAUDIOLOGIA_COLUMNA_1 = [
  { tipo: "ANTECEDENTES_PERINATALES", label: "Antecedentes perinatales" },
  { tipo: "RETRASO_LENGUAJE", label: "Retraso en la adquisición del lenguaje" },
  { tipo: "OTITIS_REPETICION", label: "Otitis a repetición" },
  { tipo: "HIPOACUSIA", label: "Hipoacusia" },
  { tipo: "AUDIFONOS_IMPLANTE_COCLEAR", label: "Audífonos o implante coclear" },
  { tipo: "RESPIRACION_BUCAL", label: "Respiración bucal o adenoides" },
  { tipo: "HABITOS_ORALES", label: "Chupete, mamadera o succión digital prolongados" },
] as const;

export const ANTECEDENTES_FONOAUDIOLOGIA_COLUMNA_2 = [
  { tipo: "DIFICULTADES_DEGLUCION", label: "Dificultades para tragar o alimentarse" },
  { tipo: "USO_PROFESIONAL_VOZ", label: "Uso profesional de la voz" },
  { tipo: "NEUROLOGICAS", label: "Neurológicas (ACV, TEA, parálisis cerebral...)" },
  { tipo: "DIFICULTADES_APRENDIZAJE", label: "Dificultades escolares o de aprendizaje" },
  { tipo: "TRATAMIENTO_FONOAUDIOLOGICO_PREVIO", label: "Tratamiento fonoaudiológico previo" },
  { tipo: "ENFERMEDADES_MEDICAS", label: "Enfermedades médicas" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_FONOAUDIOLOGIA_ORDEN = [
  ...ANTECEDENTES_FONOAUDIOLOGIA_COLUMNA_1,
  ...ANTECEDENTES_FONOAUDIOLOGIA_COLUMNA_2,
];

export function antecedentesPara(grupo: GrupoEspecialidad) {
  switch (grupo) {
    case "FONOAUDIOLOGIA":
      return {
        columna1: ANTECEDENTES_FONOAUDIOLOGIA_COLUMNA_1,
        columna2: ANTECEDENTES_FONOAUDIOLOGIA_COLUMNA_2,
        orden: ANTECEDENTES_FONOAUDIOLOGIA_ORDEN,
      };
    case "PSICOLOGIA":
      return {
        columna1: ANTECEDENTES_PSICOLOGIA_COLUMNA_1,
        columna2: ANTECEDENTES_PSICOLOGIA_COLUMNA_2,
        orden: ANTECEDENTES_PSICOLOGIA_ORDEN,
      };
    case "ODONTOLOGICA":
      return {
        columna1: ANTECEDENTES_ODONTOLOGIA_COLUMNA_1,
        columna2: ANTECEDENTES_ODONTOLOGIA_COLUMNA_2,
        orden: ANTECEDENTES_ODONTOLOGIA_ORDEN,
      };
    case "MEDICA":
      return { columna1: ANTECEDENTES_COLUMNA_1, columna2: ANTECEDENTES_COLUMNA_2, orden: ANTECEDENTES_ORDEN };
  }
}

// Antecedentes odontológicos que cambian cómo se atiende al paciente
// (anestesia, sangrado, antibiótico, cirugía). Si están en SI se avisan arriba
// de la ficha y del odontograma, con un nombre corto.
export const ANTECEDENTES_CRITICOS_ODONTOLOGIA: ReadonlyMap<string, string> = new Map([
  ["ALERGIA_ANESTESICOS", "Alergia a anestésicos locales"],
  ["ALERGIA_ANTIBIOTICOS", "Alergia a antibióticos"],
  ["ALERGIA_LATEX", "Alergia al látex"],
  ["ANTICOAGULANTES", "Anticoagulado"],
  ["BIFOSFONATOS", "Bifosfonatos"],
  ["TRASTORNOS_COAGULACION", "Trastorno de la coagulación"],
  ["ENDOCARDITIS_RIESGO", "Riesgo de endocarditis"],
  ["EMBARAZO", "Embarazo"],
  ["RADIOTERAPIA_CABEZA_CUELLO", "Radioterapia de cabeza y cuello"],
]);

// Alertas a mostrar, en el orden del checklist. El detalle (qué anestésico,
// qué droga) va entre paréntesis si se cargó.
export function alertasOdontologicas(
  antecedentes: readonly { tipo: string; respuesta: boolean; descripcion?: string | null; medicacion?: string | null }[]
): string[] {
  const porTipo = new Map(antecedentes.map((a) => [a.tipo, a]));
  const alertas: string[] = [];
  for (const [tipo, label] of ANTECEDENTES_CRITICOS_ODONTOLOGIA) {
    const a = porTipo.get(tipo);
    if (!a?.respuesta) continue;
    const detalle = (a.medicacion || a.descripcion || "").trim();
    alertas.push(detalle ? `${label} (${detalle})` : label);
  }
  return alertas;
}

// Etiqueta de cualquier antecedente, sea de la lista médica, de psicología,
// de odontología o de fonoaudiología (un paciente puede tener cargados de
// varias si el profesional cambió de especialidad). Si un tipo está en más de
// una lista, gana la última (ej. "Hipertensión" en vez de "HTA"); la de
// fonoaudiología va primera para que NEUROLOGICAS siga diciendo "Neurológicas".
export const ANTECEDENTE_LABELS: ReadonlyMap<string, string> = new Map(
  [...ANTECEDENTES_FONOAUDIOLOGIA_ORDEN, ...ANTECEDENTES_ORDEN, ...ANTECEDENTES_PSICOLOGIA_ORDEN, ...ANTECEDENTES_ODONTOLOGIA_ORDEN].map((a) => [
    a.tipo,
    a.label,
  ])
);

// Los campos que existen en las dos historias clínicas pero se llaman
// distinto. Las columnas son las mismas: solo cambia cómo se las presenta
// (formulario, ficha y copia para el paciente).
export function etiquetasHistoriaClinica(grupo: GrupoEspecialidad) {
  if (grupo === "ODONTOLOGICA") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Historia del problema actual",
      antecedentesEnfermedadAyuda:
        "Cuándo empezó, tipo de dolor (espontáneo, al frío o al calor, al masticar), piezas involucradas, tratamientos odontológicos previos y medicación que tomó.",
      habitos: "Hábitos",
      diagnosticoPresuntivo: "Diagnóstico",
      metodosComplementarios: "Estudios complementarios (Rx, panorámica, etc.)",
      tratamiento: "Plan de tratamiento",
    };
  }
  return grupo === "PSICOLOGIA"
    ? {
        motivoConsulta: "Motivo de consulta",
        antecedentesEnfermedad: "Historia del problema actual",
        antecedentesEnfermedadAyuda:
          "Cuándo y cómo empezó, desencadenantes, cómo fue evolucionando, qué intentó para resolverlo y cómo afecta su vida cotidiana.",
        habitos: "Consumo",
        diagnosticoPresuntivo: "Impresión diagnóstica",
        metodosComplementarios: "Tests y técnicas administradas",
        tratamiento: "Objetivos terapéuticos y plan de tratamiento",
      }
    : {
        motivoConsulta: "Motivo de Consulta",
        antecedentesEnfermedad: "Antecedentes de la enfermedad actual",
        antecedentesEnfermedadAyuda:
          "Fecha, hora y forma de comienzo. Descripción de los síntomas. Medicación por médico o automedicación. Episodios anteriores. Síntomas actuales",
        habitos: "Hábitos Tóxicos",
        diagnosticoPresuntivo: "Diagnóstico Presuntivo",
        metodosComplementarios: "Métodos Complementarios",
        tratamiento: "Tratamiento",
      };
}

// Campos que solo tiene la historia clínica de psicología.
export const ETIQUETAS_PSICOLOGIA = {
  derivadoPor: "Derivado por",
  expectativasTratamiento: "Demanda y expectativas",
  encuadre: "Encuadre acordado",
  grupoFamiliar: "Grupo familiar y convivientes",
  historiaVital: "Historia vital",
  enfoqueTerapeutico: "Enfoque terapéutico",
} as const;

// Cómo se llama cada entrada de la evolución. Para un psicólogo cada entrada
// es una sesión; los datos son los mismos (PatientEvolucion).
export function vocabularioEvolucion(psicologia: boolean) {
  return psicologia
    ? {
        titulo: "Sesiones",
        una: "una sesión",
        esta: "Esta sesión",
        nueva: "Nueva sesión",
        editar: "Editar sesión",
        eliminar: "Eliminar sesión",
        vacio: "Todavía no hay sesiones registradas.",
        eliminadas: "Sesiones eliminadas",
        campo: "Notas de la sesión",
        placeholder: "Escribí las notas de la sesión",
      }
    : {
        titulo: "Evolución Clínica",
        una: "una evolución",
        esta: "Esta evolución",
        nueva: "Nueva evolución",
        editar: "Editar evolución",
        eliminar: "Eliminar evolución",
        vacio: "Todavía no hay evoluciones cargadas.",
        eliminadas: "Evoluciones eliminadas",
        campo: "Observación",
        placeholder: "Escribí la evolución del paciente",
      };
}

// Datos propios de una sesión de psicología (ver PatientEvolucion en
// prisma/schema.prisma).
export const ASISTENCIA_SESION_OPTIONS = [
  { value: "PRESENTE", label: "Asistió" },
  { value: "AUSENTE", label: "Ausente" },
  { value: "CANCELADA", label: "Canceló" },
] as const;

export const MODALIDAD_SESION_OPTIONS = [
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "ONLINE", label: "Online" },
] as const;

export const NIVEL_RIESGO_OPTIONS = [
  { value: "SIN_RIESGO", label: "Sin riesgo" },
  { value: "BAJO", label: "Riesgo bajo" },
  { value: "MODERADO", label: "Riesgo moderado" },
  { value: "ALTO", label: "Riesgo alto" },
] as const;

export type AsistenciaSesion = (typeof ASISTENCIA_SESION_OPTIONS)[number]["value"];
export type ModalidadSesion = (typeof MODALIDAD_SESION_OPTIONS)[number]["value"];
export type NivelRiesgo = (typeof NIVEL_RIESGO_OPTIONS)[number]["value"];

export const ASISTENCIA_LABELS = new Map<string, string>(
  ASISTENCIA_SESION_OPTIONS.map((o) => [o.value, o.label])
);
export const MODALIDAD_LABELS = new Map<string, string>(
  MODALIDAD_SESION_OPTIONS.map((o) => [o.value, o.label])
);
export const RIESGO_LABELS = new Map<string, string>(
  NIVEL_RIESGO_OPTIONS.map((o) => [o.value, o.label])
);

// Moderado y alto se destacan en la ficha (alerta arriba de todo).
export function riesgoDestacado(riesgo: string | null | undefined): boolean {
  return riesgo === "MODERADO" || riesgo === "ALTO";
}

// Número de cada sesión: cuenta solo aquellas a las que el consultante
// asistió (sin asistencia cargada = asistió), en orden cronológico. Las
// ausencias y cancelaciones no llevan número.
export function numerarSesiones<T extends { fecha: string; asistencia?: string | null }>(
  sesiones: T[]
): Map<T, number> {
  const numeros = new Map<T, number>();
  let n = 0;
  for (const s of [...sesiones].sort((a, b) => a.fecha.localeCompare(b.fecha))) {
    if (!s.asistencia || s.asistencia === "PRESENTE") numeros.set(s, ++n);
  }
  return numeros;
}
