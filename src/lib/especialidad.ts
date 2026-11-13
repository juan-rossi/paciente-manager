import type { TituloCortesia } from "@/lib/titulo-cortesia";

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
  | "PSIQUIATRIA_INFANTIL_Y_ADOLESCENTE"
  | "ODONTOLOGIA_GENERAL"
  | "ORTODONCIA"
  | "ENDODONCIA"
  | "PERIODONCIA"
  | "IMPLANTOLOGIA"
  | "PROTESIS_REHABILITACION_ORAL"
  | "ODONTOPEDIATRIA"
  | "CIRUGIA_BUCOMAXILOFACIAL"
  | "ESTETICA_DENTAL";

// El orden acá define el orden del <select> -- generales primero, después
// las más específicas, después las subespecialidades pediátricas (mismo
// orden en el que las pidió el usuario) y por último el bloque de odontología.
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
  // Odontología: bloque aparte al final, general primero.
  ODONTOLOGIA_GENERAL: "Odontología General",
  ORTODONCIA: "Ortodoncia y Ortopedia Dentomaxilar",
  ENDODONCIA: "Endodoncia",
  PERIODONCIA: "Periodoncia",
  IMPLANTOLOGIA: "Implantología",
  PROTESIS_REHABILITACION_ORAL: "Prótesis Dental / Rehabilitación Oral",
  ODONTOPEDIATRIA: "Odontopediatría",
  CIRUGIA_BUCOMAXILOFACIAL: "Cirugía y Traumatología Bucomaxilofacial",
  ESTETICA_DENTAL: "Estética Dental / Odontología Restauradora",
};

export const ESPECIALIDAD_VALUES = Object.keys(ESPECIALIDAD_LABELS) as Especialidad[];

// Especialidades odontológicas. La historia clínica de estos profesionales
// se va a comportar distinto (odontograma, etc.), así que cualquier lógica
// que dependa de "es odontólogo" tiene que pasar por esOdontologica() y no
// comparar valores sueltos. Si se agrega una especialidad odontológica nueva,
// sumarla acá.
export const ESPECIALIDADES_ODONTOLOGICAS: ReadonlySet<Especialidad> = new Set<Especialidad>([
  "ODONTOLOGIA_GENERAL",
  "ORTODONCIA",
  "ENDODONCIA",
  "PERIODONCIA",
  "IMPLANTOLOGIA",
  "PROTESIS_REHABILITACION_ORAL",
  "ODONTOPEDIATRIA",
  "CIRUGIA_BUCOMAXILOFACIAL",
  "ESTETICA_DENTAL",
]);

export function esOdontologica(especialidad: Especialidad | null | undefined): boolean {
  return especialidad != null && ESPECIALIDADES_ODONTOLOGICAS.has(especialidad);
}

export const ESPECIALIDAD_OPTIONS = ESPECIALIDAD_VALUES.map((value) => ({
  value,
  label: ESPECIALIDAD_LABELS[value],
  odontologica: ESPECIALIDADES_ODONTOLOGICAS.has(value),
}));

// Títulos que identifican a un odontólogo. En el registro, el título decide
// qué especialidades se ofrecen: Od./Odont. ven solo las odontológicas; el
// resto (o sin título elegido), solo las no odontológicas.
const TITULOS_ODONTOLOGICOS: ReadonlySet<TituloCortesia> = new Set<TituloCortesia>(["OD", "ODONT"]);

export function esTituloOdontologico(titulo: TituloCortesia | null | undefined | ""): boolean {
  return !!titulo && TITULOS_ODONTOLOGICOS.has(titulo);
}

export function especialidadesParaTitulo(titulo: TituloCortesia | null | undefined | "") {
  const odontologo = esTituloOdontologico(titulo);
  return ESPECIALIDAD_OPTIONS.filter((o) => o.odontologica === odontologo);
}

export function especialidadCompatibleConTitulo(
  titulo: TituloCortesia | null | undefined | "",
  especialidad: Especialidad | null | undefined | "",
): boolean {
  if (!especialidad) return true;
  return esOdontologica(especialidad) === esTituloOdontologico(titulo);
}
