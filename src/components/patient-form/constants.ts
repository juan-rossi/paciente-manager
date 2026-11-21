import type { GrupoEspecialidad } from "@/lib/especialidad";
import { edadGestacional, formatEdadGestacional, formulaObstetrica } from "@/lib/obstetricia";
import { imcLegible } from "@/lib/nutricion";

export const ANTECEDENTES_COLUMNA_1 = [
  { tipo: "DISLIPEMIA", label: "Dislipemia" },
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

// Historia clínica pediátrica (ver esPediatrica()): lo que un pediatra
// pregunta en la primera consulta. Reusa del enum ALERGIA, ASMA,
// CARDIOPATIAS, OTITIS_REPETICION, ANTECEDENTES_PERINATALES y
// ENFERMEDADES_MEDICAS.
export const ANTECEDENTES_PEDIATRIA_COLUMNA_1 = [
  { tipo: "ANTECEDENTES_PERINATALES", label: "Antecedentes perinatales" },
  { tipo: "VACUNACION_INCOMPLETA", label: "Vacunación incompleta" },
  { tipo: "RETRASO_DESARROLLO", label: "Retraso madurativo o del desarrollo" },
  { tipo: "ALERGIA", label: "Alergias" },
  { tipo: "ASMA", label: "Asma o broncoespasmo recurrente" },
  { tipo: "OTITIS_REPETICION", label: "Otitis a repetición" },
  { tipo: "CONVULSIONES", label: "Convulsiones (incluye febriles)" },
] as const;

export const ANTECEDENTES_PEDIATRIA_COLUMNA_2 = [
  { tipo: "CARDIOPATIAS", label: "Cardiopatías" },
  { tipo: "ENFERMEDADES_MEDICAS", label: "Enfermedades crónicas" },
  { tipo: "INTERNACIONES_PREVIAS", label: "Internaciones" },
  { tipo: "CIRUGIAS_PREVIAS", label: "Cirugías" },
  { tipo: "TABAQUISMO_HOGAR", label: "Humo de tabaco en el hogar" },
  { tipo: "ANTECEDENTES_FAMILIARES", label: "Enfermedades familiares relevantes" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_PEDIATRIA_ORDEN = [
  ...ANTECEDENTES_PEDIATRIA_COLUMNA_1,
  ...ANTECEDENTES_PEDIATRIA_COLUMNA_2,
];

// Historia clínica de salud de la mujer (ver esGinecologica()). La fórmula
// obstétrica, la FUM, la menarca y los controles no son sí/no: van en campos
// propios (ver ETIQUETAS_GINECOLOGIA). Reusa del enum EMBARAZO, NOD_MAMAS,
// TRASTORNOS_COAGULACION (importa para indicar anticonceptivos hormonales),
// HTA, DIABETES, HIPOTIROIDISMO y ALERGIA.
export const ANTECEDENTES_GINECOLOGIA_COLUMNA_1 = [
  { tipo: "EMBARAZO", label: "Embarazo actual" },
  { tipo: "COMPLICACIONES_OBSTETRICAS", label: "Complicaciones en embarazos previos" },
  { tipo: "TRASTORNOS_MENSTRUALES", label: "Trastornos menstruales" },
  { tipo: "INFECCIONES_TRANSMISION_SEXUAL", label: "Infecciones de transmisión sexual (incluye HPV)" },
  { tipo: "PAP_ALTERADO", label: "PAP o colposcopía alterados" },
  { tipo: "NOD_MAMAS", label: "Patología mamaria" },
  { tipo: "CIRUGIAS_GINECOLOGICAS", label: "Cirugías ginecológicas o mamarias" },
] as const;

export const ANTECEDENTES_GINECOLOGIA_COLUMNA_2 = [
  { tipo: "CANCER_MAMA_OVARIO_FAMILIAR", label: "Cáncer de mama u ovario en la familia" },
  { tipo: "TRATAMIENTO_HORMONAL", label: "Tratamiento hormonal" },
  { tipo: "TRASTORNOS_COAGULACION", label: "Trombosis o trastornos de la coagulación" },
  { tipo: "HTA", label: "Hipertensión" },
  { tipo: "DIABETES", label: "Diabetes" },
  { tipo: "HIPOTIROIDISMO", label: "Hipotiroidismo" },
  { tipo: "ALERGIA", label: "Alergias" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_GINECOLOGIA_ORDEN = [
  ...ANTECEDENTES_GINECOLOGIA_COLUMNA_1,
  ...ANTECEDENTES_GINECOLOGIA_COLUMNA_2,
];

// Historia clínica de psiquiatría (ver esPsiquiatrica()): los antecedentes de
// salud mental de psicología más los médicos que pesan al indicar un
// psicofármaco (epilepsia, QT prolongado, embarazo o lactancia).
export const ANTECEDENTES_PSIQUIATRIA_COLUMNA_1 = [
  { tipo: "TRATAMIENTO_PSIQUIATRICO_PREVIO", label: "Tratamiento psiquiátrico previo" },
  { tipo: "MEDICACION_PSIQUIATRICA", label: "Psicofármacos (actuales o previos)" },
  { tipo: "INTERNACIONES_PSIQUIATRICAS", label: "Internaciones psiquiátricas" },
  { tipo: "TRATAMIENTO_PSICOLOGICO_PREVIO", label: "Psicoterapia previa o actual" },
  { tipo: "CONSUMO_SUSTANCIAS", label: "Consumo de sustancias" },
  { tipo: "AUTOLESIONES", label: "Autolesiones" },
  { tipo: "INTENTOS_SUICIDIO", label: "Intentos de suicidio" },
] as const;

export const ANTECEDENTES_PSIQUIATRIA_COLUMNA_2 = [
  { tipo: "SALUD_MENTAL_FAMILIAR", label: "Antecedentes psiquiátricos familiares" },
  { tipo: "SITUACIONES_TRAUMATICAS", label: "Situaciones traumáticas" },
  { tipo: "NEUROLOGICAS", label: "Neurológicas (epilepsia, TEC, demencia)" },
  { tipo: "CARDIOPATIAS", label: "Cardiopatías o QT prolongado" },
  { tipo: "ENFERMEDADES_MEDICAS", label: "Otras enfermedades médicas" },
  { tipo: "EMBARAZO", label: "Embarazo o lactancia" },
  { tipo: "ALERGIA", label: "Alergias" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_PSIQUIATRIA_ORDEN = [
  ...ANTECEDENTES_PSIQUIATRIA_COLUMNA_1,
  ...ANTECEDENTES_PSIQUIATRIA_COLUMNA_2,
];

// Historia clínica de nutrición (ver esNutricion()): lo que cambia el plan
// alimentario. Reusa del enum DIABETES, DISLIPEMIA, HTA, HIPOTIROIDISMO,
// ALERGIA, EMBARAZO y ANTECEDENTES_FAMILIARES.
export const ANTECEDENTES_NUTRICION_COLUMNA_1 = [
  { tipo: "DIABETES", label: "Diabetes o glucemia alterada" },
  { tipo: "DISLIPEMIA", label: "Colesterol o triglicéridos altos" },
  { tipo: "HTA", label: "Hipertensión" },
  { tipo: "HIPOTIROIDISMO", label: "Hipotiroidismo" },
  { tipo: "ENFERMEDAD_RENAL", label: "Enfermedad renal" },
  { tipo: "ENFERMEDADES_DIGESTIVAS", label: "Enfermedades digestivas" },
  { tipo: "EMBARAZO", label: "Embarazo o lactancia" },
] as const;

export const ANTECEDENTES_NUTRICION_COLUMNA_2 = [
  { tipo: "ENFERMEDAD_CELIACA", label: "Celiaquía" },
  { tipo: "ALERGIA", label: "Alergias alimentarias" },
  { tipo: "INTOLERANCIAS_ALIMENTARIAS", label: "Intolerancias alimentarias" },
  { tipo: "TRASTORNOS_CONDUCTA_ALIMENTARIA", label: "Trastornos de la conducta alimentaria" },
  { tipo: "CIRUGIA_BARIATRICA", label: "Cirugía bariátrica" },
  { tipo: "DIETAS_PREVIAS", label: "Dietas o tratamientos previos para el peso" },
  { tipo: "ANTECEDENTES_FAMILIARES", label: "Obesidad, diabetes o enfermedad cardiovascular en la familia" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_NUTRICION_ORDEN = [
  ...ANTECEDENTES_NUTRICION_COLUMNA_1,
  ...ANTECEDENTES_NUTRICION_COLUMNA_2,
];

// Oftalmología (ver esOftalmologica()): lo que pesa en el ojo, incluidos el
// glaucoma familiar y los corticoides (cataratas, hipertensión ocular).
export const ANTECEDENTES_OFTALMOLOGIA_COLUMNA_1 = [
  { tipo: "USO_ANTEOJOS_LENTES", label: "Usa anteojos o lentes de contacto" },
  { tipo: "GLAUCOMA", label: "Glaucoma o hipertensión ocular" },
  { tipo: "CIRUGIA_OCULAR", label: "Cirugías oculares (cataratas, refractiva, láser)" },
  { tipo: "TRAUMATISMO_OCULAR", label: "Traumatismos oculares" },
  { tipo: "GLAUCOMA_FAMILIAR", label: "Glaucoma o ceguera en la familia" },
] as const;

export const ANTECEDENTES_OFTALMOLOGIA_COLUMNA_2 = [
  { tipo: "DIABETES", label: "Diabetes" },
  { tipo: "HTA", label: "Hipertensión" },
  { tipo: "ENFERMEDADES_AUTOINMUNES", label: "Enfermedades autoinmunes" },
  { tipo: "CORTICOIDES", label: "Uso de corticoides" },
  { tipo: "ALERGIA", label: "Alergias" },
  { tipo: "OTROS", label: "Otros" },
] as const;

// ORL (ver esOtorrinolaringologica()).
export const ANTECEDENTES_ORL_COLUMNA_1 = [
  { tipo: "OTITIS_REPETICION", label: "Otitis a repetición" },
  { tipo: "HIPOACUSIA", label: "Hipoacusia" },
  { tipo: "ACUFENOS", label: "Acúfenos" },
  { tipo: "VERTIGO", label: "Vértigo o mareos" },
  { tipo: "RINOSINUSITIS_CRONICA", label: "Rinitis o sinusitis crónica" },
  { tipo: "RONQUIDO_APNEAS", label: "Ronquidos o apneas del sueño" },
] as const;

export const ANTECEDENTES_ORL_COLUMNA_2 = [
  { tipo: "CIRUGIAS_ORL", label: "Cirugías ORL (amígdalas, adenoides, tubos, nariz)" },
  { tipo: "EXPOSICION_RUIDO", label: "Exposición a ruido" },
  { tipo: "USO_PROFESIONAL_VOZ", label: "Uso profesional de la voz" },
  { tipo: "ANTICOAGULANTES", label: "Anticoagulantes o antiagregantes" },
  { tipo: "ALERGIA", label: "Alergias" },
  { tipo: "OTROS", label: "Otros" },
] as const;

// Dermatología (ver esDermatologica()). Embarazo e inmunosupresión importan
// para indicar retinoides, inmunosupresores o biológicos.
export const ANTECEDENTES_DERMATOLOGIA_COLUMNA_1 = [
  { tipo: "DERMATITIS_ATOPICA", label: "Dermatitis atópica" },
  { tipo: "PSORIASIS", label: "Psoriasis" },
  { tipo: "EXPOSICION_SOLAR", label: "Exposición solar intensa o quemaduras solares" },
  { tipo: "CANCER_PIEL", label: "Cáncer de piel propio o familiar" },
  { tipo: "TRATAMIENTOS_DERMATOLOGICOS_PREVIOS", label: "Tratamientos dermatológicos previos" },
] as const;

export const ANTECEDENTES_DERMATOLOGIA_COLUMNA_2 = [
  { tipo: "ENFERMEDADES_AUTOINMUNES", label: "Enfermedades autoinmunes" },
  { tipo: "INMUNOSUPRESION", label: "Inmunosupresión o trasplante" },
  { tipo: "EMBARAZO", label: "Embarazo o lactancia" },
  { tipo: "DIABETES", label: "Diabetes" },
  { tipo: "ALERGIA", label: "Alergias (medicamentos, contacto)" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_OFTALMOLOGIA_ORDEN = [
  ...ANTECEDENTES_OFTALMOLOGIA_COLUMNA_1,
  ...ANTECEDENTES_OFTALMOLOGIA_COLUMNA_2,
];
export const ANTECEDENTES_ORL_ORDEN = [...ANTECEDENTES_ORL_COLUMNA_1, ...ANTECEDENTES_ORL_COLUMNA_2];
export const ANTECEDENTES_DERMATOLOGIA_ORDEN = [
  ...ANTECEDENTES_DERMATOLOGIA_COLUMNA_1,
  ...ANTECEDENTES_DERMATOLOGIA_COLUMNA_2,
];

// Aparato locomotor y dolor (ver esLocomotor()). Anticoagulantes y
// corticoides importan antes de una infiltración o una cirugía.
export const ANTECEDENTES_LOCOMOTOR_COLUMNA_1 = [
  { tipo: "TRAUMATISMOS_PREVIOS", label: "Traumatismos o fracturas previas" },
  { tipo: "CIRUGIAS_PREVIAS", label: "Cirugías (incluye prótesis)" },
  { tipo: "ARTROSIS", label: "Artrosis" },
  { tipo: "ARTRITIS", label: "Artritis o enfermedad reumática" },
  { tipo: "OSTEOPOROSIS", label: "Osteoporosis" },
  { tipo: "ENFERMEDADES_AUTOINMUNES", label: "Enfermedades autoinmunes" },
] as const;

export const ANTECEDENTES_LOCOMOTOR_COLUMNA_2 = [
  { tipo: "ACTIVIDAD_DEPORTIVA", label: "Actividad deportiva o trabajo de esfuerzo" },
  { tipo: "ANTICOAGULANTES", label: "Anticoagulantes o antiagregantes" },
  { tipo: "CORTICOIDES", label: "Uso de corticoides" },
  { tipo: "DIABETES", label: "Diabetes" },
  { tipo: "ALERGIA", label: "Alergias (incluye AINEs)" },
  { tipo: "OTROS", label: "Otros" },
] as const;

// Oncología y hematología (ver esOncologica()).
export const ANTECEDENTES_ONCOLOGIA_COLUMNA_1 = [
  { tipo: "QUIMIOTERAPIA_PREVIA", label: "Quimioterapia o inmunoterapia" },
  { tipo: "RADIOTERAPIA_PREVIA", label: "Radioterapia" },
  { tipo: "CIRUGIA_ONCOLOGICA", label: "Cirugía oncológica" },
  { tipo: "TRANSFUSIONES", label: "Transfusiones" },
  { tipo: "DISPOSITIVO_ACCESO_VENOSO", label: "Catéter o port implantable" },
  { tipo: "ANTECEDENTES_FAMILIARES", label: "Cáncer en la familia" },
] as const;

export const ANTECEDENTES_ONCOLOGIA_COLUMNA_2 = [
  { tipo: "TRASTORNOS_COAGULACION", label: "Trombosis o trastornos de la coagulación" },
  { tipo: "INMUNOSUPRESION", label: "Inmunosupresión o infecciones graves" },
  { tipo: "CARDIOPATIAS", label: "Cardiopatías" },
  { tipo: "DIABETES", label: "Diabetes" },
  { tipo: "ALERGIA", label: "Alergias (incluye reacciones a quimioterapia)" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_LOCOMOTOR_ORDEN = [...ANTECEDENTES_LOCOMOTOR_COLUMNA_1, ...ANTECEDENTES_LOCOMOTOR_COLUMNA_2];
export const ANTECEDENTES_ONCOLOGIA_ORDEN = [...ANTECEDENTES_ONCOLOGIA_COLUMNA_1, ...ANTECEDENTES_ONCOLOGIA_COLUMNA_2];

// Geriatría (ver esGeriatrica()): los síndromes geriátricos, más lo médico
// que más pesa a esa edad.
export const ANTECEDENTES_GERIATRIA_COLUMNA_1 = [
  { tipo: "CAIDAS", label: "Caídas en el último año" },
  { tipo: "DETERIORO_COGNITIVO", label: "Deterioro cognitivo o demencia" },
  { tipo: "POLIFARMACIA", label: "Polifarmacia (5 o más medicamentos)" },
  { tipo: "INCONTINENCIA", label: "Incontinencia" },
  { tipo: "ULCERAS_PRESION", label: "Úlceras por presión" },
  { tipo: "DEPENDENCIA_FUNCIONAL", label: "Dependencia para la vida diaria" },
] as const;

export const ANTECEDENTES_GERIATRIA_COLUMNA_2 = [
  { tipo: "HTA", label: "Hipertensión" },
  { tipo: "DIABETES", label: "Diabetes" },
  { tipo: "CARDIOPATIAS", label: "Cardiopatías" },
  { tipo: "ANTICOAGULANTES", label: "Anticoagulantes o antiagregantes" },
  { tipo: "OSTEOPOROSIS", label: "Osteoporosis" },
  { tipo: "ALERGIA", label: "Alergias" },
  { tipo: "OTROS", label: "Otros" },
] as const;

export const ANTECEDENTES_GERIATRIA_ORDEN = [...ANTECEDENTES_GERIATRIA_COLUMNA_1, ...ANTECEDENTES_GERIATRIA_COLUMNA_2];

export function antecedentesPara(grupo: GrupoEspecialidad) {
  switch (grupo) {
    case "GERIATRICA":
      return {
        columna1: ANTECEDENTES_GERIATRIA_COLUMNA_1,
        columna2: ANTECEDENTES_GERIATRIA_COLUMNA_2,
        orden: ANTECEDENTES_GERIATRIA_ORDEN,
      };
    case "LOCOMOTOR":
      return {
        columna1: ANTECEDENTES_LOCOMOTOR_COLUMNA_1,
        columna2: ANTECEDENTES_LOCOMOTOR_COLUMNA_2,
        orden: ANTECEDENTES_LOCOMOTOR_ORDEN,
      };
    case "ONCOLOGICA":
      return {
        columna1: ANTECEDENTES_ONCOLOGIA_COLUMNA_1,
        columna2: ANTECEDENTES_ONCOLOGIA_COLUMNA_2,
        orden: ANTECEDENTES_ONCOLOGIA_ORDEN,
      };
    case "OFTALMOLOGICA":
      return {
        columna1: ANTECEDENTES_OFTALMOLOGIA_COLUMNA_1,
        columna2: ANTECEDENTES_OFTALMOLOGIA_COLUMNA_2,
        orden: ANTECEDENTES_OFTALMOLOGIA_ORDEN,
      };
    case "ORL":
      return { columna1: ANTECEDENTES_ORL_COLUMNA_1, columna2: ANTECEDENTES_ORL_COLUMNA_2, orden: ANTECEDENTES_ORL_ORDEN };
    case "DERMATOLOGICA":
      return {
        columna1: ANTECEDENTES_DERMATOLOGIA_COLUMNA_1,
        columna2: ANTECEDENTES_DERMATOLOGIA_COLUMNA_2,
        orden: ANTECEDENTES_DERMATOLOGIA_ORDEN,
      };
    case "NUTRICION":
      return {
        columna1: ANTECEDENTES_NUTRICION_COLUMNA_1,
        columna2: ANTECEDENTES_NUTRICION_COLUMNA_2,
        orden: ANTECEDENTES_NUTRICION_ORDEN,
      };
    case "PSIQUIATRICA":
      return {
        columna1: ANTECEDENTES_PSIQUIATRIA_COLUMNA_1,
        columna2: ANTECEDENTES_PSIQUIATRIA_COLUMNA_2,
        orden: ANTECEDENTES_PSIQUIATRIA_ORDEN,
      };
    case "GINECOLOGICA":
      return {
        columna1: ANTECEDENTES_GINECOLOGIA_COLUMNA_1,
        columna2: ANTECEDENTES_GINECOLOGIA_COLUMNA_2,
        orden: ANTECEDENTES_GINECOLOGIA_ORDEN,
      };
    case "PEDIATRICA":
      return {
        columna1: ANTECEDENTES_PEDIATRIA_COLUMNA_1,
        columna2: ANTECEDENTES_PEDIATRIA_COLUMNA_2,
        orden: ANTECEDENTES_PEDIATRIA_ORDEN,
      };
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

// Pediatría: lo que hay que tener presente antes de indicar un medicamento o
// ante un cuadro febril.
export const ANTECEDENTES_CRITICOS_PEDIATRIA: ReadonlyMap<string, string> = new Map([
  ["ALERGIA", "Alergia"],
  ["CARDIOPATIAS", "Cardiopatía"],
  ["CONVULSIONES", "Convulsiones"],
]);

// Salud de la mujer: embarazo (cambia qué se puede indicar o estudiar),
// trombosis (contraindica estrógenos) y alergias.
export const ANTECEDENTES_CRITICOS_GINECOLOGIA: ReadonlyMap<string, string> = new Map([
  ["EMBARAZO", "Embarazo"],
  ["TRASTORNOS_COAGULACION", "Trombosis o trastorno de la coagulación"],
  ["ALERGIA", "Alergia"],
]);

// Psiquiatría: lo que cambia la evaluación del riesgo y qué se puede indicar.
// El riesgo actual se avisa aparte (último registrado en la evolución).
export const ANTECEDENTES_CRITICOS_PSIQUIATRIA: ReadonlyMap<string, string> = new Map([
  ["INTENTOS_SUICIDIO", "Intentos de suicidio previos"],
  ["EMBARAZO", "Embarazo o lactancia"],
  ["ALERGIA", "Alergia"],
]);

// Nutrición: lo que no puede faltar al armar un plan alimentario (y un TCA,
// que cambia cómo se habla del peso).
export const ANTECEDENTES_CRITICOS_NUTRICION: ReadonlyMap<string, string> = new Map([
  ["ENFERMEDAD_CELIACA", "Celiaquía"],
  ["ALERGIA", "Alergia alimentaria"],
  ["TRASTORNOS_CONDUCTA_ALIMENTARIA", "Trastorno de la conducta alimentaria"],
  ["CIRUGIA_BARIATRICA", "Cirugía bariátrica"],
  ["EMBARAZO", "Embarazo o lactancia"],
]);

// Oftalmología: glaucoma (contraindica midriáticos y corticoides sin
// control) y alergias (a colirios).
export const ANTECEDENTES_CRITICOS_OFTALMOLOGIA: ReadonlyMap<string, string> = new Map([
  ["GLAUCOMA", "Glaucoma o hipertensión ocular"],
  ["ALERGIA", "Alergia"],
]);

// ORL: sangrado en procedimientos y alergias.
export const ANTECEDENTES_CRITICOS_ORL: ReadonlyMap<string, string> = new Map([
  ["ANTICOAGULANTES", "Anticoagulado"],
  ["ALERGIA", "Alergia"],
]);

// Dermatología: lo que contraindica retinoides, inmunosupresores o biológicos.
export const ANTECEDENTES_CRITICOS_DERMATOLOGIA: ReadonlyMap<string, string> = new Map([
  ["EMBARAZO", "Embarazo o lactancia"],
  ["INMUNOSUPRESION", "Inmunosupresión"],
  ["ALERGIA", "Alergia"],
]);

// Aparato locomotor: sangrado en infiltraciones o cirugías y alergias (AINEs).
export const ANTECEDENTES_CRITICOS_LOCOMOTOR: ReadonlyMap<string, string> = new Map([
  ["ANTICOAGULANTES", "Anticoagulado"],
  ["ALERGIA", "Alergia"],
]);

// Oncología: trombosis, inmunosupresión (riesgo de infección) y alergias.
export const ANTECEDENTES_CRITICOS_ONCOLOGIA: ReadonlyMap<string, string> = new Map([
  ["TRASTORNOS_COAGULACION", "Trombosis o trastorno de la coagulación"],
  ["INMUNOSUPRESION", "Inmunosuprimido"],
  ["ALERGIA", "Alergia"],
]);

// Geriatría: riesgo de caídas, deterioro cognitivo (quién decide y quién
// toma la medicación), sangrado y alergias.
export const ANTECEDENTES_CRITICOS_GERIATRIA: ReadonlyMap<string, string> = new Map([
  ["CAIDAS", "Caídas"],
  ["DETERIORO_COGNITIVO", "Deterioro cognitivo"],
  ["ANTICOAGULANTES", "Anticoagulado"],
  ["ALERGIA", "Alergia"],
]);

const ANTECEDENTES_CRITICOS: Partial<Record<GrupoEspecialidad, ReadonlyMap<string, string>>> = {
  GERIATRICA: ANTECEDENTES_CRITICOS_GERIATRIA,
  LOCOMOTOR: ANTECEDENTES_CRITICOS_LOCOMOTOR,
  ONCOLOGICA: ANTECEDENTES_CRITICOS_ONCOLOGIA,
  OFTALMOLOGICA: ANTECEDENTES_CRITICOS_OFTALMOLOGIA,
  ORL: ANTECEDENTES_CRITICOS_ORL,
  DERMATOLOGICA: ANTECEDENTES_CRITICOS_DERMATOLOGIA,
  NUTRICION: ANTECEDENTES_CRITICOS_NUTRICION,
  PSIQUIATRICA: ANTECEDENTES_CRITICOS_PSIQUIATRIA,
  ODONTOLOGICA: ANTECEDENTES_CRITICOS_ODONTOLOGIA,
  PEDIATRICA: ANTECEDENTES_CRITICOS_PEDIATRIA,
  GINECOLOGICA: ANTECEDENTES_CRITICOS_GINECOLOGIA,
};

type AntecedenteParaAlerta = {
  tipo: string;
  respuesta: boolean;
  descripcion?: string | null;
  medicacion?: string | null;
};

// Alertas a mostrar arriba de la ficha, en el orden del checklist. El detalle
// (qué anestésico, a qué es alérgico) va entre paréntesis si se cargó. Los
// grupos sin antecedentes críticos no tienen alertas.
export function alertasClinicas(grupo: GrupoEspecialidad, antecedentes: readonly AntecedenteParaAlerta[]): string[] {
  const criticos = ANTECEDENTES_CRITICOS[grupo];
  if (!criticos) return [];
  const porTipo = new Map(antecedentes.map((a) => [a.tipo, a]));
  const alertas: string[] = [];
  for (const [tipo, label] of criticos) {
    const a = porTipo.get(tipo);
    if (!a?.respuesta) continue;
    const detalle = (a.medicacion || a.descripcion || "").trim();
    alertas.push(detalle ? `${label} (${detalle})` : label);
  }
  return alertas;
}

export function alertasOdontologicas(antecedentes: readonly AntecedenteParaAlerta[]): string[] {
  return alertasClinicas("ODONTOLOGICA", antecedentes);
}

// Antecedentes que solo aplican a un sexo. Si el paciente es del otro sexo y
// no están marcados, el formulario no los muestra (si están en SI se muestran
// igual, para no esconder un dato cargado). Sin sexo cargado se muestran todos.
const ANTECEDENTES_SOLO_MASCULINO: ReadonlySet<string> = new Set(["PROSTATA"]);

export function antecedenteAplicaAlSexo(
  tipo: string,
  sexo: string | null | undefined,
  respuesta: boolean
): boolean {
  if (respuesta) return true;
  return !(sexo === "FEMENINO" && ANTECEDENTES_SOLO_MASCULINO.has(tipo));
}

// Etiqueta de cualquier antecedente, sea de la lista médica, de psicología,
// de odontología, de fonoaudiología, de pediatría o de salud de la mujer (un paciente puede tener
// cargados de varias si el profesional cambió de especialidad, o si lo atiende
// otro profesional del consultorio). Si un tipo está en más de una lista,
// gana la última (ej. "Hipertensión" en vez de "HTA"); pediatría y
// fonoaudiología van primeras para que los tipos que reusan sigan con su
// etiqueta de siempre (ej. NEUROLOGICAS dice "Neurológicas"). Igual con salud
// de la mujer, psiquiatría, nutrición, oftalmología, ORL y dermatología.
export const ANTECEDENTE_LABELS: ReadonlyMap<string, string> = new Map(
  [
    ...ANTECEDENTES_GERIATRIA_ORDEN,
    ...ANTECEDENTES_LOCOMOTOR_ORDEN,
    ...ANTECEDENTES_ONCOLOGIA_ORDEN,
    ...ANTECEDENTES_OFTALMOLOGIA_ORDEN,
    ...ANTECEDENTES_ORL_ORDEN,
    ...ANTECEDENTES_DERMATOLOGIA_ORDEN,
    ...ANTECEDENTES_NUTRICION_ORDEN,
    ...ANTECEDENTES_PSIQUIATRIA_ORDEN,
    ...ANTECEDENTES_GINECOLOGIA_ORDEN, ...ANTECEDENTES_PEDIATRIA_ORDEN, ...ANTECEDENTES_FONOAUDIOLOGIA_ORDEN, ...ANTECEDENTES_ORDEN, ...ANTECEDENTES_PSICOLOGIA_ORDEN, ...ANTECEDENTES_ODONTOLOGIA_ORDEN].map((a) => [
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
  if (grupo === "GERIATRICA") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Enfermedad actual",
      antecedentesEnfermedadAyuda:
        "Quién acompaña y quién relata, desde cuándo, cambios en la funcionalidad, la memoria o el ánimo, caídas recientes y medicación que toma (incluida la de venta libre).",
      habitos: "Hábitos Tóxicos",
      diagnosticoPresuntivo: "Diagnóstico Presuntivo",
      metodosComplementarios: "Métodos Complementarios",
      tratamiento: "Tratamiento e indicaciones",
    };
  }
  if (grupo === "LOCOMOTOR") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Enfermedad actual",
      antecedentesEnfermedadAyuda:
        "Mecanismo (traumatismo, sobreuso o espontáneo), desde cuándo, características del dolor (mecánico o inflamatorio, irradiación, rigidez matinal), limitación funcional y tratamientos recibidos (AINEs, kinesiología, infiltraciones).",
      habitos: "Hábitos Tóxicos",
      diagnosticoPresuntivo: "Diagnóstico",
      metodosComplementarios: "Estudios (RX, ecografía, RMN, laboratorio)",
      tratamiento: "Tratamiento e indicaciones",
    };
  }
  if (grupo === "ONCOLOGICA") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Enfermedad actual",
      antecedentesEnfermedadAyuda:
        "Diagnóstico oncológico o hematológico y cuándo se hizo, tratamientos recibidos y su respuesta, síntomas actuales (dolor, fatiga, pérdida de peso, fiebre) y toxicidades.",
      habitos: "Hábitos Tóxicos",
      diagnosticoPresuntivo: "Diagnóstico",
      metodosComplementarios: "Estudios (laboratorio, imágenes, anatomía patológica, marcadores)",
      tratamiento: "Plan de tratamiento",
    };
  }
  if (grupo === "OFTALMOLOGICA") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Enfermedad actual",
      antecedentesEnfermedadAyuda:
        "Qué ojo, desde cuándo, cómo empezó (brusco o progresivo), visión borrosa, dolor, ojo rojo, secreción, fotofobia, moscas volantes o destellos, y qué gotas o tratamiento usó.",
      habitos: "Hábitos Tóxicos",
      diagnosticoPresuntivo: "Diagnóstico",
      metodosComplementarios: "Estudios (campo visual, OCT, topografía, ecografía)",
      tratamiento: "Tratamiento e indicaciones",
    };
  }
  if (grupo === "ORL") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Enfermedad actual",
      antecedentesEnfermedadAyuda:
        "Desde cuándo y de qué lado, características (dolor, secreción, hipoacusia, acúfenos, vértigo, obstrucción nasal, disfonía, disfagia), episodios previos y tratamientos que recibió.",
      habitos: "Hábitos Tóxicos",
      diagnosticoPresuntivo: "Diagnóstico",
      metodosComplementarios: "Estudios (audiometría, impedanciometría, fibroscopía, imágenes)",
      tratamiento: "Tratamiento e indicaciones",
    };
  }
  if (grupo === "DERMATOLOGICA") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Enfermedad actual",
      antecedentesEnfermedadAyuda:
        "Desde cuándo, dónde empezó y cómo se extendió, si pica, duele o sangra, cambios de tamaño o color, desencadenantes (sol, contacto, medicamentos) y qué se aplicó o tomó.",
      habitos: "Hábitos Tóxicos",
      diagnosticoPresuntivo: "Diagnóstico",
      metodosComplementarios: "Estudios (biopsia, cultivo, laboratorio)",
      tratamiento: "Tratamiento e indicaciones",
    };
  }
  if (grupo === "NUTRICION") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Historia del peso y la alimentación",
      antecedentesEnfermedadAyuda:
        "Cómo fue cambiando el peso (máximo, mínimo, cambios recientes), dietas o tratamientos anteriores y cómo le fue, qué le cuesta de su alimentación y qué espera lograr.",
      habitos: "Hábitos Tóxicos",
      diagnosticoPresuntivo: "Diagnóstico nutricional",
      metodosComplementarios: "Laboratorio y estudios",
      tratamiento: "Plan alimentario y objetivos",
    };
  }
  if (grupo === "PSIQUIATRICA") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Enfermedad actual",
      antecedentesEnfermedadAyuda:
        "Quién consulta y quién deriva, cuándo y cómo empezó, desencadenantes, síntomas y su evolución, tratamientos y psicofármacos que recibió (dosis, respuesta, efectos adversos) y cómo afecta su vida cotidiana.",
      habitos: "Consumo",
      diagnosticoPresuntivo: "Diagnóstico",
      metodosComplementarios: "Estudios y escalas",
      tratamiento: "Plan terapéutico y psicofármacos",
    };
  }
  if (grupo === "GINECOLOGICA") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Enfermedad actual",
      antecedentesEnfermedadAyuda:
        "Cuándo empezó, características (sangrado, flujo, dolor, relación con el ciclo), síntomas asociados, tratamientos que recibió y si hay posibilidad de embarazo.",
      habitos: "Hábitos Tóxicos",
      diagnosticoPresuntivo: "Diagnóstico presuntivo",
      metodosComplementarios: "Estudios (PAP, colposcopía, ecografía, mamografía, laboratorio)",
      tratamiento: "Tratamiento e indicaciones",
    };
  }
  if (grupo === "PEDIATRICA") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Enfermedad actual",
      antecedentesEnfermedadAyuda:
        "Quién consulta y quién relata, cuándo empezó, síntomas (fiebre, tos, vómitos, diarrea), cómo come, toma líquidos y orina, medicación que recibió con la dosis, y si hay contactos enfermos en casa, el jardín o la escuela.",
      habitos: "Consumo (adolescentes)",
      diagnosticoPresuntivo: "Diagnóstico presuntivo",
      metodosComplementarios: "Métodos complementarios",
      tratamiento: "Tratamiento e indicaciones",
    };
  }
  if (grupo === "FONOAUDIOLOGIA") {
    return {
      motivoConsulta: "Motivo de consulta",
      antecedentesEnfermedad: "Historia del problema actual",
      antecedentesEnfermedadAyuda:
        "Quién deriva, cuándo empezó la dificultad (lenguaje, habla, voz, audición, deglución o lectoescritura), cómo fue evolucionando, hitos del desarrollo y evaluaciones o tratamientos previos.",
      habitos: "Hábitos",
      diagnosticoPresuntivo: "Diagnóstico fonoaudiológico",
      metodosComplementarios: "Evaluaciones y estudios (audiometría, tests)",
      tratamiento: "Objetivos y plan terapéutico",
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

// Campos que solo tiene la historia clínica de salud de la mujer.
export const ETIQUETAS_GINECOLOGIA = {
  menarca: "Menarca",
  ritmoMenstrual: "Ritmo menstrual",
  fum: "FUM",
  menopausia: "Menopausia",
  gestas: "Gestas",
  partos: "Partos",
  cesareas: "Cesáreas",
  abortos: "Abortos",
  metodoAnticonceptivo: "Método anticonceptivo",
  ultimoPap: "Último PAP / colposcopía",
  ultimaMamografia: "Última mamografía / ecografía mamaria",
} as const;

type DatosGinecoObstetricos = { [K in keyof typeof ETIQUETAS_GINECOLOGIA]?: string | null };

function fechaCorta(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : fecha;
}

// Lo cargado de la historia gineco-obstétrica, listo para mostrar en la ficha
// y en la copia de la historia clínica (solo lo que tiene valor). Con
// embarazo en curso suma la edad gestacional de hoy y la FPP.
export function datosGinecoObstetricos(
  p: DatosGinecoObstetricos,
  embarazada: boolean
): { label: string; value: string }[] {
  const eg = embarazada ? edadGestacional(p.fum) : null;
  const datos = [
    { label: ETIQUETAS_GINECOLOGIA.menarca, value: p.menarca },
    { label: ETIQUETAS_GINECOLOGIA.ritmoMenstrual, value: p.ritmoMenstrual },
    { label: ETIQUETAS_GINECOLOGIA.fum, value: p.fum ? fechaCorta(p.fum) : null },
    {
      label: "Edad gestacional",
      value: eg ? `${formatEdadGestacional(eg)} · FPP ${fechaCorta(eg.fpp)}` : null,
    },
    { label: ETIQUETAS_GINECOLOGIA.menopausia, value: p.menopausia },
    { label: "Fórmula obstétrica", value: formulaObstetrica(p) },
    { label: ETIQUETAS_GINECOLOGIA.metodoAnticonceptivo, value: p.metodoAnticonceptivo },
    { label: ETIQUETAS_GINECOLOGIA.ultimoPap, value: p.ultimoPap },
    { label: ETIQUETAS_GINECOLOGIA.ultimaMamografia, value: p.ultimaMamografia },
  ];
  return datos.filter((d): d is { label: string; value: string } => Boolean(d.value?.trim()));
}

// Texto de ayuda de los campos de Diagnóstico, según el grupo. Lo que no
// figura va sin ayuda (el nombre del campo ya lo dice).
export function ayudasDiagnostico(grupo: GrupoEspecialidad): {
  diagnosticoPresuntivo?: string;
  metodosComplementarios?: string;
  tratamiento?: string;
} {
  switch (grupo) {
    case "PSIQUIATRICA":
      return {
        diagnosticoPresuntivo: "Si usás CIE-10, CIE-11 o DSM-5, podés anotar el código.",
        metodosComplementarios:
          "Laboratorio (litemia, función tiroidea, hemograma, perfil metabólico), ECG, neuroimágenes y escalas (PHQ-9, GAD-7, MMSE, etc.), con fecha y resultados.",
        tratamiento:
          "Psicofármacos (droga, dosis, horario y desde cuándo), psicoterapia indicada, pautas de alarma y próximo control.",
      };
    case "LOCOMOTOR":
      return {
        tratamiento:
          "Medicación (droga, dosis y duración), kinesiología, reposo u ortesis, infiltraciones o cirugía, y próximo control.",
      };
    case "GERIATRICA":
      return {
        metodosComplementarios: "Laboratorio, imágenes y escalas (Barthel, Lawton, minimental, Yesavage), con fecha y puntaje.",
        tratamiento:
          "Cambios de medicación (incluida la desprescripción), cuidados, rehabilitación, apoyo familiar y próximo control.",
      };
    case "ONCOLOGICA":
      return {
        diagnosticoPresuntivo: "Tipo histológico, estadificación (TNM o la que corresponda) y fecha del diagnóstico.",
        tratamiento:
          "Esquema (drogas, dosis, ciclo número), intención (curativa o paliativa), tratamiento de soporte y próximos controles.",
      };
    case "NUTRICION":
      return {
        metodosComplementarios: "Glucemia, perfil lipídico, función tiroidea, hemograma, etc., con fecha y resultados.",
        tratamiento: "Tipo de plan, calorías o porciones, objetivos (peso, hábitos) y frecuencia de los controles.",
      };
    case "PEDIATRICA":
      return {
        metodosComplementarios: "Laboratorio, RX, ecografía, etc.",
        tratamiento: "Drogas con dosis por kilo, número de tomas y duración; pautas de alarma y próximo control.",
      };
    case "MEDICA":
      return {
        metodosComplementarios: "Laboratorio, RX, ecografía, etc.",
        tratamiento: "Drogas, dosis, número de tomas y tiempo de duración.",
      };
    default:
      return {};
  }
}

// Psicología y psiquiatría son salud mental: registran el nivel de riesgo y
// notas privadas en cada evolución (y se avisa arriba de la ficha si el último
// es moderado o alto), y usan la derivación, el grupo familiar, la historia
// vital y "consumo" en vez de "hábitos tóxicos".
export function esSaludMental(grupo: GrupoEspecialidad): boolean {
  return grupo === "PSICOLOGIA" || grupo === "PSIQUIATRICA";
}

// Examen psíquico de psiquiatría (en lugar del examen físico). Cada campo
// lleva qué explorar.
export const EXAMEN_PSIQUICO = [
  { campo: "epAspecto", label: "Aspecto y actitud", ayuda: "Vestimenta, higiene, contacto, actitud ante la entrevista" },
  { campo: "epConciencia", label: "Conciencia y orientación", ayuda: "Lúcido, orientado en tiempo, espacio y persona" },
  { campo: "epAtencionMemoria", label: "Atención y memoria", ayuda: "Hipoprosexia, distraibilidad, fallas de memoria reciente o remota" },
  {
    campo: "epPensamiento",
    label: "Pensamiento",
    ayuda: "Curso (velocidad, coherencia) y contenido (ideas delirantes, obsesivas, de muerte o suicidio)",
  },
  { campo: "epSensopercepcion", label: "Sensopercepción", ayuda: "Alucinaciones o ilusiones (tipo y contenido)" },
  {
    campo: "epAfectividad",
    label: "Humor y afectividad",
    ayuda: "Eutímico, deprimido, eufórico, ansioso; afecto congruente, aplanado o lábil",
  },
  { campo: "epPsicomotricidad", label: "Psicomotricidad y conducta", ayuda: "Inquietud, enlentecimiento, impulsividad, agresividad" },
  {
    campo: "epSuenoApetito",
    label: "Sueño y apetito",
    ayuda: "Insomnio (de conciliación, intermedio o de despertar precoz), hipersomnia, cambios de apetito o de peso",
  },
  { campo: "epJuicio", label: "Juicio e insight", ayuda: "Juicio conservado o desviado; conciencia de enfermedad" },
] as const;

export type CampoExamenPsiquico = (typeof EXAMEN_PSIQUICO)[number]["campo"];

export const ETIQUETAS_EXAMEN_PSIQUICO = Object.fromEntries(
  EXAMEN_PSIQUICO.map((e) => [e.campo, e.label])
) as Record<CampoExamenPsiquico, string>;

// Evaluación nutricional (en lugar del examen físico). Peso, peso habitual y
// estatura son las columnas de signos vitales.
export const ETIQUETAS_NUTRICION = {
  circunferenciaCintura: "Circunferencia de cintura",
  circunferenciaCadera: "Circunferencia de cadera",
  porcentajeGrasa: "Masa grasa (%)",
  pesoObjetivo: "Peso objetivo",
  actividadFisica: "Actividad física",
  habitosAlimentarios: "Hábitos alimentarios",
  recordatorio24h: "Recordatorio de 24 horas",
} as const;

type DatosNutricionales = { [K in keyof typeof ETIQUETAS_NUTRICION]?: string | null } & {
  pesoActual?: string | null;
  pesoHabitual?: string | null;
  estatura?: string | null;
};

// Lo cargado de la evaluación nutricional, listo para la ficha y la copia de
// la historia clínica (solo lo que tiene valor), con el IMC calculado. Los
// textos largos (hábitos, recordatorio) van aparte.
export function datosEvaluacionNutricional(
  p: DatosNutricionales,
  menorDeEdad: boolean
): { label: string; value: string }[] {
  const datos = [
    { label: "Peso", value: p.pesoActual },
    { label: "Peso habitual", value: p.pesoHabitual },
    { label: "Estatura", value: p.estatura },
    { label: "IMC", value: imcLegible(p.pesoActual, p.estatura, menorDeEdad) },
    { label: ETIQUETAS_NUTRICION.circunferenciaCintura, value: p.circunferenciaCintura },
    { label: ETIQUETAS_NUTRICION.circunferenciaCadera, value: p.circunferenciaCadera },
    { label: ETIQUETAS_NUTRICION.porcentajeGrasa, value: p.porcentajeGrasa },
    { label: ETIQUETAS_NUTRICION.pesoObjetivo, value: p.pesoObjetivo },
    { label: ETIQUETAS_NUTRICION.actividadFisica, value: p.actividadFisica },
  ];
  return datos.filter((d): d is { label: string; value: string } => Boolean(d.value?.trim()));
}

// Psicología y fonoaudiología trabajan por tratamiento en sesiones: cada
// evolución es una sesión numerada, con asistencia y modalidad. El riesgo y
// las notas privadas son solo de psicología.
export function usaSesiones(grupo: GrupoEspecialidad): boolean {
  return grupo === "PSICOLOGIA" || grupo === "FONOAUDIOLOGIA";
}

// Cómo se llama cada entrada de la evolución (ver usaSesiones()); los datos
// son los mismos (PatientEvolucion).
export function vocabularioEvolucion(sesiones: boolean) {
  return sesiones
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
