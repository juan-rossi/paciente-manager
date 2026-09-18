export type Especialidad =
  | "CLINICA_MEDICA"
  | "MEDICINA_FAMILIAR_GENERAL"
  | "PEDIATRIA"
  | "GINECOLOGIA"
  | "OBSTETRICIA"
  | "CARDIOLOGIA"
  | "DERMATOLOGIA"
  | "ENDOCRINOLOGIA"
  | "GASTROENTEROLOGIA"
  | "TRAUMATOLOGIA_Y_ORTOPEDIA"
  | "OFTALMOLOGIA"
  | "OTORRINOLARINGOLOGIA"
  | "NEUROLOGIA"
  | "PSIQUIATRIA"
  | "UROLOGIA"
  | "REUMATOLOGIA"
  | "NEUMONOLOGIA"
  | "ALERGIA_E_INMUNOLOGIA"
  | "INFECTOLOGIA"
  | "NEFROLOGIA"
  | "HEMATOLOGIA"
  | "ONCOLOGIA"
  | "GERIATRIA"
  | "NUTRICION"
  | "FLEBOLOGIA"
  | "DIABETOLOGIA"
  | "MEDICINA_DEL_DEPORTE"
  | "MEDICINA_FISICA_Y_REHABILITACION_FISIATRIA"
  | "MEDICINA_REPRODUCTIVA_FERTILIDAD"
  | "MEDICINA_DEL_DOLOR"
  | "MEDICINA_PALIATIVA"
  | "HEPATOLOGIA"
  | "COLOPROCTOLOGIA"
  | "MASTOLOGIA"
  | "ANDROLOGIA"
  | "CARDIOLOGIA_INFANTIL"
  | "NEUROLOGIA_INFANTIL"
  | "ENDOCRINOLOGIA_INFANTIL"
  | "GASTROENTEROLOGIA_INFANTIL"
  | "NEUMONOLOGIA_INFANTIL"
  | "NEFROLOGIA_INFANTIL"
  | "REUMATOLOGIA_INFANTIL"
  | "ALERGIA_E_INMUNOLOGIA_INFANTIL"
  | "INFECTOLOGIA_INFANTIL"
  | "PSIQUIATRIA_INFANTIL_Y_ADOLESCENTE";

// El orden acá define el orden del <select> -- generales primero, después
// las más específicas, y las subespecialidades pediátricas al final (mismo
// orden en el que las pidió el usuario).
export const ESPECIALIDAD_LABELS: Record<Especialidad, string> = {
  CLINICA_MEDICA: "Clínica Médica",
  MEDICINA_FAMILIAR_GENERAL: "Medicina Familiar / Medicina General",
  PEDIATRIA: "Pediatría",
  GINECOLOGIA: "Ginecología",
  OBSTETRICIA: "Obstetricia",
  CARDIOLOGIA: "Cardiología",
  DERMATOLOGIA: "Dermatología",
  ENDOCRINOLOGIA: "Endocrinología",
  GASTROENTEROLOGIA: "Gastroenterología",
  TRAUMATOLOGIA_Y_ORTOPEDIA: "Traumatología y Ortopedia",
  OFTALMOLOGIA: "Oftalmología",
  OTORRINOLARINGOLOGIA: "Otorrinolaringología",
  NEUROLOGIA: "Neurología",
  PSIQUIATRIA: "Psiquiatría",
  UROLOGIA: "Urología",
  REUMATOLOGIA: "Reumatología",
  NEUMONOLOGIA: "Neumonología",
  ALERGIA_E_INMUNOLOGIA: "Alergia e Inmunología",
  INFECTOLOGIA: "Infectología",
  NEFROLOGIA: "Nefrología",
  HEMATOLOGIA: "Hematología",
  ONCOLOGIA: "Oncología",
  GERIATRIA: "Geriatría",
  NUTRICION: "Nutrición",
  FLEBOLOGIA: "Flebología",
  DIABETOLOGIA: "Diabetología",
  MEDICINA_DEL_DEPORTE: "Medicina del Deporte",
  MEDICINA_FISICA_Y_REHABILITACION_FISIATRIA: "Medicina Física y Rehabilitación / Fisiatría",
  MEDICINA_REPRODUCTIVA_FERTILIDAD: "Medicina Reproductiva / Fertilidad",
  MEDICINA_DEL_DOLOR: "Medicina del Dolor",
  MEDICINA_PALIATIVA: "Medicina Paliativa",
  HEPATOLOGIA: "Hepatología",
  COLOPROCTOLOGIA: "Coloproctología",
  MASTOLOGIA: "Mastología",
  ANDROLOGIA: "Andrología",
  CARDIOLOGIA_INFANTIL: "Cardiología Infantil",
  NEUROLOGIA_INFANTIL: "Neurología Infantil",
  ENDOCRINOLOGIA_INFANTIL: "Endocrinología Infantil",
  GASTROENTEROLOGIA_INFANTIL: "Gastroenterología Infantil",
  NEUMONOLOGIA_INFANTIL: "Neumonología Infantil",
  NEFROLOGIA_INFANTIL: "Nefrología Infantil",
  REUMATOLOGIA_INFANTIL: "Reumatología Infantil",
  ALERGIA_E_INMUNOLOGIA_INFANTIL: "Alergia e Inmunología Infantil",
  INFECTOLOGIA_INFANTIL: "Infectología Infantil",
  PSIQUIATRIA_INFANTIL_Y_ADOLESCENTE: "Psiquiatría Infantil y Adolescente",
};

export const ESPECIALIDAD_VALUES = Object.keys(ESPECIALIDAD_LABELS) as Especialidad[];

export const ESPECIALIDAD_OPTIONS = ESPECIALIDAD_VALUES.map((value) => ({
  value,
  label: ESPECIALIDAD_LABELS[value],
}));
