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

export function antecedentesPara(psicologia: boolean) {
  return psicologia
    ? {
        columna1: ANTECEDENTES_PSICOLOGIA_COLUMNA_1,
        columna2: ANTECEDENTES_PSICOLOGIA_COLUMNA_2,
        orden: ANTECEDENTES_PSICOLOGIA_ORDEN,
      }
    : { columna1: ANTECEDENTES_COLUMNA_1, columna2: ANTECEDENTES_COLUMNA_2, orden: ANTECEDENTES_ORDEN };
}

// Etiqueta de cualquier antecedente, sea de la lista médica o de psicología
// (un paciente puede tener cargados de las dos si el profesional cambió de
// especialidad).
export const ANTECEDENTE_LABELS: ReadonlyMap<string, string> = new Map(
  [...ANTECEDENTES_ORDEN, ...ANTECEDENTES_PSICOLOGIA_ORDEN].map((a) => [a.tipo, a.label])
);

// Los campos que existen en las dos historias clínicas pero se llaman
// distinto. Las columnas son las mismas: solo cambia cómo se las presenta
// (formulario, ficha y copia para el paciente).
export function etiquetasHistoriaClinica(psicologia: boolean) {
  return psicologia
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
