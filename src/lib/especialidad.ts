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
  | "PSICOLOGIA"
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
// orden en el que las pidió el usuario), psicología y por último el bloque
// de odontología.
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
  // Psicología no es una especialidad médica (es Lic. en Psicología): no
  // confundir con Psiquiatría. Ver esPsicologia().
  PSICOLOGIA: "Psicología",
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

// Segmento de URL legible de cada especialidad para las páginas indexables del
// directorio (`/directorio/especialidad/cardiologia`). Se deriva del enum, así
// que una especialidad nueva tiene su página sin tocar nada más -- pero
// renombrar un valor del enum cambia su URL (y rompe los links ya indexados).
export function especialidadSlug(especialidad: Especialidad): string {
  return especialidad.toLowerCase().replace(/_/g, "-");
}

export function especialidadDesdeSlug(slug: string): Especialidad | null {
  return ESPECIALIDAD_VALUES.find((e) => especialidadSlug(e) === slug) ?? null;
}

export function especialidadPath(especialidad: Especialidad): string {
  return `/directorio/especialidad/${especialidadSlug(especialidad)}`;
}

export function esEspecialidad(value: string): value is Especialidad {
  return value in ESPECIALIDAD_LABELS;
}

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

// Psicología: no es médica, así que no usa el examen físico ni los signos
// vitales. Igual que con odontología, cualquier lógica que dependa de "es
// psicólogo" tiene que pasar por esPsicologia().
export function esPsicologia(especialidad: Especialidad | null | undefined): boolean {
  return especialidad === "PSICOLOGIA";
}

// El examen físico (y sus signos vitales) es cosa de médicos: los odontólogos
// tienen el odontograma en su lugar y los psicólogos no lo usan.
export function usaExamenFisico(especialidad: Especialidad | null | undefined): boolean {
  return !esOdontologica(especialidad) && !esPsicologia(especialidad);
}

// Grupo de profesión de cada especialidad. En el registro, el título de
// cortesía decide qué grupos se ofrecen (ver gruposParaTitulo()).
// También decide la historia clínica (antecedentes, etiquetas, dictado y
// plantillas de consentimiento): ver grupoEspecialidad().
export type GrupoEspecialidad = "MEDICA" | "ODONTOLOGICA" | "PSICOLOGIA";

function grupoDe(especialidad: Especialidad): GrupoEspecialidad {
  if (esOdontologica(especialidad)) return "ODONTOLOGICA";
  if (esPsicologia(especialidad)) return "PSICOLOGIA";
  return "MEDICA";
}

// Igual que grupoDe(), pero acepta un profesional sin especialidad cargada
// (cuentas viejas), que se trata como médico.
export function grupoEspecialidad(especialidad: Especialidad | null | undefined): GrupoEspecialidad {
  return especialidad ? grupoDe(especialidad) : "MEDICA";
}

export const ESPECIALIDAD_OPTIONS = ESPECIALIDAD_VALUES.map((value) => ({
  value,
  label: ESPECIALIDAD_LABELS[value],
  grupo: grupoDe(value),
}));

// Títulos que identifican la profesión. En el registro, el título decide qué
// especialidades se ofrecen:
//  - Od./Odont. -> solo las odontológicas.
//  - Psic./Psi. -> solo Psicología.
//  - Dr./Dra./Méd./Med. -> solo las médicas.
//  - El resto (Lic., Bioq., Klgo., Enf.) o sin título -> médicas y Psicología
//    ("Lic." lo usan psicólogos, pero también nutricionistas, kinesiólogos...).
const TITULOS_ODONTOLOGICOS: ReadonlySet<TituloCortesia> = new Set<TituloCortesia>(["OD", "ODONT"]);
const TITULOS_PSICOLOGIA: ReadonlySet<TituloCortesia> = new Set<TituloCortesia>(["PSIC", "PSI"]);
const TITULOS_MEDICOS: ReadonlySet<TituloCortesia> = new Set<TituloCortesia>([
  "DR",
  "DRA",
  "MED",
  "MED_SIN_TILDE",
]);

function gruposParaTitulo(
  titulo: TituloCortesia | null | undefined | ""
): ReadonlySet<GrupoEspecialidad> {
  if (titulo && TITULOS_ODONTOLOGICOS.has(titulo)) return new Set(["ODONTOLOGICA"]);
  if (titulo && TITULOS_PSICOLOGIA.has(titulo)) return new Set(["PSICOLOGIA"]);
  if (titulo && TITULOS_MEDICOS.has(titulo)) return new Set(["MEDICA"]);
  return new Set(["MEDICA", "PSICOLOGIA"]);
}

export function especialidadesParaTitulo(titulo: TituloCortesia | null | undefined | "") {
  const grupos = gruposParaTitulo(titulo);
  return ESPECIALIDAD_OPTIONS.filter((o) => grupos.has(o.grupo));
}

export function especialidadCompatibleConTitulo(
  titulo: TituloCortesia | null | undefined | "",
  especialidad: Especialidad | null | undefined | "",
): boolean {
  if (!especialidad) return true;
  return gruposParaTitulo(titulo).has(grupoDe(especialidad));
}

// Límites del dictado por voz y del resumen con IA. Los psicólogos dictan
// sesiones enteras (hasta una hora); el resto, notas de consulta (10 min).
// El dictado largo se graba y sube en segmentos de 10 min (ver
// use-cloud-transcription.ts), así que esto solo fija el total.
export function limitesDictado(especialidad: Especialidad | null | undefined) {
  return esPsicologia(especialidad)
    ? { maxGrabacionSegundos: 60 * 60, maxCaracteresResumen: 100_000, maxTokensResumen: 4096 }
    : { maxGrabacionSegundos: 10 * 60, maxCaracteresResumen: 20_000, maxTokensResumen: 1024 };
}
