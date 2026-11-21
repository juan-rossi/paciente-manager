import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CODIGO_TOPE_IA, requirePremiumDoctor } from "@/lib/ia-auth";
import { costoResumenMaximoUsd, costoResumenUsd } from "@/lib/ia-costos";
import { confirmarUsoIA, liberarUsoIA, mensajeTopeIA, reservarUsoIA } from "@/lib/ia-tope";
import { grupoEspecialidad, limitesDictado, type GrupoEspecialidad } from "@/lib/especialidad";
import { REGLA_RESUMEN } from "@/lib/ia-especialidad";

// Una sesión de psicología de una hora son ~20k tokens de entrada y hasta 4k
// de salida: con Haiku puede pasar los 60 segundos.
export const maxDuration = 120;

const resumirInput = z.object({
  // El máximo depende de la especialidad (ver limitesDictado()) y se chequea
  // después de conocer al médico.
  texto: z.string().trim().min(1, "No hay texto para resumir."),
  tipo: z.enum(["antecedentes", "evolucion"]),
});

const REGLAS_COMUNES = `Reglas:
- No inventes ni infieras datos que no estén en el dictado. Si algo es ambiguo, dejalo como está.
- Conservá exactos medicamentos, dosis, frecuencias, fechas, tiempos de evolución y valores medidos.
- El texto viene de un reconocimiento de voz: corregí solo errores de transcripción evidentes en términos médicos o nombres de medicamentos (ej. "perasetamol" → "paracetamol"). Ante la duda, dejá la palabra como está.
- Eliminá muletillas, repeticiones, autocorrecciones y frases que no aportan información clínica.
- Usá lenguaje médico conciso, en español rioplatense neutro, en tercera persona ("Paciente refiere...").
- Texto plano: sin markdown, sin títulos con #, sin negritas. Podés usar guiones "- " para listar ítems.
- Respondé solo con el resumen, sin introducción ni comentarios.`;

const SYSTEM_PROMPTS: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas. Vas a recibir la transcripción de un dictado de un médico sobre los antecedentes de la enfermedad actual de un paciente. Resumilo en un párrafo breve (o pocos ítems) con lo clínicamente relevante: inicio y evolución de los síntomas, características, factores desencadenantes o que alivian, estudios y tratamientos previos.

${REGLAS_COMUNES}`,
  evolucion: `Sos un asistente que redacta historias clínicas. Vas a recibir la transcripción de un dictado de un médico sobre la evolución de un paciente en una consulta. Resumila con lo clínicamente relevante: lo que refiere el paciente, hallazgos del examen, resultados de estudios, diagnóstico o impresión, indicaciones y plan de control.

${REGLAS_COMUNES}`,
};

const REGLAS_PSICOLOGIA = `Reglas:
- No inventes ni infieras datos que no estén en el dictado. No agregues diagnósticos, hipótesis ni interpretaciones que el psicólogo no haya dicho. Si algo es ambiguo, dejalo como está.
- Conservá exactos nombres, fechas, tiempos, frecuencias, medicación mencionada y las frases textuales del consultante que el psicólogo destaque (entre comillas).
- El texto viene de un reconocimiento de voz: corregí solo errores de transcripción evidentes. Ante la duda, dejá la palabra como está.
- Eliminá muletillas, repeticiones, autocorrecciones y frases que no aportan información clínica.
- Usá lenguaje profesional conciso, en español rioplatense neutro, en tercera persona ("Consultante refiere...").
- Texto plano: sin markdown, sin títulos con #, sin negritas. Podés usar guiones "- " para listar ítems y separar los apartados con una línea en blanco.
- Respondé solo con el resumen, sin introducción ni comentarios.`;

// Psicólogos: el dictado suele ser una sesión entera (hasta una hora), así
// que el resumen es más largo y está organizado por apartados.
const SYSTEM_PROMPTS_PSICOLOGIA: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas psicológicas. Vas a recibir la transcripción de un dictado de un psicólogo sobre la historia del problema actual de un consultante. Resumilo con lo clínicamente relevante: motivo de consulta, cuándo y cómo empezó la problemática, desencadenantes, cómo fue evolucionando, qué intentó para resolverla y cómo afecta su vida cotidiana. Si los menciona, incluí también historia personal y familiar, vínculos significativos, tratamientos psicológicos o psiquiátricos previos y medicación.

${REGLAS_PSICOLOGIA}`,
  evolucion: `Sos un asistente que redacta historias clínicas psicológicas. Vas a recibir la transcripción de una sesión o de un dictado de un psicólogo sobre la evolución de un consultante. Resumila con lo clínicamente relevante, en este orden y omitiendo los apartados sin información: temas trabajados en la sesión, relato del consultante, estado emocional y afectivo observado, intervenciones del terapeuta, acuerdos o tareas, y plan para la próxima sesión.

${REGLAS_PSICOLOGIA}`,
};

const REGLAS_ODONTOLOGIA = `Reglas:
- No inventes ni infieras datos que no estén en el dictado. Si algo es ambiguo, dejalo como está.
- Conservá exactos los números de pieza, las caras, los materiales, los medicamentos, dosis, fechas y valores medidos.
- Escribí las piezas en notación FDI de dos dígitos sin punto ("pieza 36", no "pieza 3.6" ni "tres seis"), y las caras con su nombre completo (mesial, distal, oclusal, vestibular, palatina, lingual).
- El texto viene de un reconocimiento de voz: corregí solo errores de transcripción evidentes en términos odontológicos o nombres de medicamentos. Ante la duda, dejá la palabra como está.
- Eliminá muletillas, repeticiones, autocorrecciones y frases que no aportan información clínica.
- Usá lenguaje odontológico conciso, en español rioplatense neutro, en tercera persona ("Paciente refiere...").
- Texto plano: sin markdown, sin títulos con #, sin negritas. Podés usar guiones "- " para listar ítems.
- Respondé solo con el resumen, sin introducción ni comentarios.`;

const SYSTEM_PROMPTS_ODONTOLOGIA: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas odontológicas. Vas a recibir la transcripción de un dictado de un odontólogo sobre el problema actual de un paciente. Resumilo en un párrafo breve (o pocos ítems) con lo clínicamente relevante: motivo de consulta, inicio y características del dolor o la molestia, piezas involucradas, tratamientos odontológicos previos, y antecedentes médicos que importen para la atención (alergias, anticoagulantes, bifosfonatos, embarazo, enfermedades de base).

${REGLAS_ODONTOLOGIA}`,
  evolucion: `Sos un asistente que redacta historias clínicas odontológicas. Vas a recibir la transcripción de un dictado de un odontólogo sobre una consulta. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refiere el paciente, hallazgos por pieza, prácticas realizadas (pieza, caras, material, anestesia), indicaciones y próximo paso del plan de tratamiento.

${REGLAS_ODONTOLOGIA}`,
};

const REGLAS_FONOAUDIOLOGIA = `Reglas:
- No inventes ni infieras datos que no estén en el dictado. No agregues diagnósticos ni conclusiones que el fonoaudiólogo no haya dicho. Si algo es ambiguo, dejalo como está.
- Conservá exactos los fonemas, sílabas y palabras que se trabajaron o que el paciente produce con error (ej. "sustituye /r/ por /l/"), los resultados de pruebas y tests, los valores de audiometría, las edades, fechas, frecuencias y la medicación mencionada.
- El texto viene de un reconocimiento de voz: corregí solo errores de transcripción evidentes en términos fonoaudiológicos (ej. "dislalia", "disfonía", "deglución atípica", "logoaudiometría"). Ante la duda, dejá la palabra como está.
- Eliminá muletillas, repeticiones, autocorrecciones y frases que no aportan información clínica.
- Usá lenguaje profesional conciso, en español rioplatense neutro, en tercera persona ("Paciente presenta...", o "Los padres refieren..." si el relato es de ellos).
- Texto plano: sin markdown, sin títulos con #, sin negritas. Podés usar guiones "- " para listar ítems.
- Respondé solo con el resumen, sin introducción ni comentarios.`;

// Fonoaudiólogos: no hay examen físico ni fármacos; el foco es lenguaje,
// habla, voz, audición y deglución, y muchas veces el relato es de los padres.
const SYSTEM_PROMPTS_FONOAUDIOLOGIA: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas fonoaudiológicas. Vas a recibir la transcripción de un dictado de un fonoaudiólogo sobre el problema actual de un paciente. Resumilo en un párrafo breve (o pocos ítems) con lo clínicamente relevante: motivo de consulta y quién deriva, cuándo empezó y cómo evolucionó la dificultad (lenguaje, habla, voz, audición, deglución o lectoescritura), hitos del desarrollo, antecedentes auditivos, escolaridad o uso de la voz, evaluaciones y tratamientos previos.

${REGLAS_FONOAUDIOLOGIA}`,
  evolucion: `Sos un asistente que redacta historias clínicas fonoaudiológicas. Vas a recibir la transcripción de un dictado de un fonoaudiólogo sobre una sesión. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: objetivos y áreas trabajadas, actividades o técnicas, desempeño y respuesta del paciente, evaluaciones o pruebas administradas y sus resultados, indicaciones para el hogar o la escuela, y plan para la próxima sesión.

${REGLAS_FONOAUDIOLOGIA}`,
};

const REGLAS_PEDIATRIA = `Reglas:
- No inventes ni infieras datos que no estén en el dictado. Si algo es ambiguo, dejalo como está.
- Conservá exactos medicamentos, dosis (incluidas las dosis por kilo), frecuencias, fechas, edades, tiempos de evolución, temperaturas, peso, talla, perímetro cefálico y percentiles.
- El texto viene de un reconocimiento de voz: corregí solo errores de transcripción evidentes en términos médicos o nombres de medicamentos. Ante la duda, dejá la palabra como está.
- Eliminá muletillas, repeticiones, autocorrecciones y frases que no aportan información clínica.
- Usá lenguaje médico conciso, en español rioplatense neutro, en tercera persona ("Paciente presenta...", o "La madre refiere..." si el relato es de un familiar: conservá quién relata).
- Texto plano: sin markdown, sin títulos con #, sin negritas. Podés usar guiones "- " para listar ítems.
- Respondé solo con el resumen, sin introducción ni comentarios.`;

// Pediatras: el relato suele ser de los padres, la medicación va por peso y
// en el control importan el crecimiento, las vacunas y el desarrollo.
const SYSTEM_PROMPTS_PEDIATRIA: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas pediátricas. Vas a recibir la transcripción de un dictado de un pediatra sobre la enfermedad actual de un paciente. Resumila en un párrafo breve (o pocos ítems) con lo clínicamente relevante: quién relata, inicio y evolución de los síntomas, fiebre (cuánto y desde cuándo), alimentación, hidratación y diuresis, medicación recibida con su dosis, contactos enfermos, y antecedentes que importen (perinatales, vacunas, alergias, enfermedades previas).

${REGLAS_PEDIATRIA}`,
  evolucion: `Sos un asistente que redacta historias clínicas pediátricas. Vas a recibir la transcripción de un dictado de un pediatra sobre una consulta o un control. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refieren el paciente o sus padres, peso, talla, perímetro cefálico y percentiles, desarrollo y vacunas, hallazgos del examen, diagnóstico o impresión, indicaciones (con las dosis) y pautas de alarma y de control.

${REGLAS_PEDIATRIA}`,
};

// Ginecólogos y obstetras: las reglas médicas comunes, con lo que importa
// conservar exacto en la historia gineco-obstétrica.
const REGLAS_GINECOLOGIA = `${REGLAS_COMUNES}
- Conservá exactos la FUM, la edad gestacional, la fórmula obstétrica (gestas, partos, cesáreas, abortos), la altura uterina, los latidos fetales, la tensión arterial y los resultados de PAP, colposcopía, ecografías y mamografías (incluida la categoría BI-RADS).`;

const SYSTEM_PROMPTS_GINECOLOGIA: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas ginecológicas y obstétricas. Vas a recibir la transcripción de un dictado de un ginecólogo u obstetra sobre la enfermedad actual de una paciente. Resumila en un párrafo breve (o pocos ítems) con lo clínicamente relevante: motivo de consulta, inicio y características de los síntomas y su relación con el ciclo, antecedentes gineco-obstétricos mencionados, método anticonceptivo, estudios y tratamientos previos.

${REGLAS_GINECOLOGIA}`,
  evolucion: `Sos un asistente que redacta historias clínicas ginecológicas y obstétricas. Vas a recibir la transcripción de un dictado de un ginecólogo u obstetra sobre una consulta o un control. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refiere la paciente, en el control prenatal la edad gestacional, peso, tensión arterial, altura uterina, latidos y movimientos fetales, hallazgos del examen, resultados de estudios, diagnóstico o impresión, indicaciones y próximo control.

${REGLAS_GINECOLOGIA}`,
};

const REGLAS_PSIQUIATRIA = `Reglas:
- No inventes ni infieras datos que no estén en el dictado. No agregues diagnósticos, hipótesis ni interpretaciones que el psiquiatra no haya dicho. Si algo es ambiguo, dejalo como está.
- Conservá exactos los psicofármacos, dosis, horarios, cambios de dosis, efectos adversos, valores de laboratorio (ej. litemia), fechas, tiempos de evolución y las frases textuales del paciente que el psiquiatra destaque (entre comillas).
- Conservá siempre, sin suavizarla, cualquier mención de ideación suicida, autolesiones, heteroagresividad o consumo.
- El texto viene de un reconocimiento de voz: corregí solo errores de transcripción evidentes en términos psiquiátricos o nombres de medicamentos (ej. "cetralina" → "sertralina"). Ante la duda, dejá la palabra como está.
- Eliminá muletillas, repeticiones, autocorrecciones y frases que no aportan información clínica.
- Usá lenguaje médico conciso, en español rioplatense neutro, en tercera persona ("Paciente refiere...").
- Texto plano: sin markdown, sin títulos con #, sin negritas. Podés usar guiones "- " para listar ítems.
- Respondé solo con el resumen, sin introducción ni comentarios.`;

// Psiquiatras: examen psíquico en vez de examen físico, y el foco del control
// está en la respuesta a la medicación y el riesgo.
const SYSTEM_PROMPTS_PSIQUIATRIA: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas psiquiátricas. Vas a recibir la transcripción de un dictado de un psiquiatra sobre la enfermedad actual de un paciente. Resumila en un párrafo breve (o pocos ítems) con lo clínicamente relevante: motivo de consulta y quién deriva, inicio y evolución de los síntomas, desencadenantes, tratamientos y psicofármacos previos (dosis, respuesta, efectos adversos), internaciones, consumo, riesgo y cómo afecta su vida cotidiana.

${REGLAS_PSIQUIATRIA}`,
  evolucion: `Sos un asistente que redacta historias clínicas psiquiátricas. Vas a recibir la transcripción de un dictado de un psiquiatra sobre una consulta de control. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refiere el paciente, examen psíquico (humor, afecto, pensamiento, sensopercepción, sueño, apetito, juicio), riesgo, adherencia, respuesta y efectos adversos de la medicación, cambios en el tratamiento con sus dosis, estudios indicados y próximo control.

${REGLAS_PSIQUIATRIA}`,
};

const REGLAS_NUTRICION = `Reglas:
- No inventes ni infieras datos que no estén en el dictado. Si algo es ambiguo, dejalo como está.
- Conservá exactos el peso, la talla, el IMC, las circunferencias, los porcentajes, las calorías, las porciones, los alimentos y cantidades, las fechas y los valores de laboratorio.
- El texto viene de un reconocimiento de voz: corregí solo errores de transcripción evidentes en términos de nutrición o nombres de alimentos. Ante la duda, dejá la palabra como está.
- Eliminá muletillas, repeticiones, autocorrecciones y frases que no aportan información clínica.
- Usá lenguaje profesional conciso, en español rioplatense neutro, en tercera persona ("Paciente refiere..."). Describí el peso y la alimentación sin juicios de valor.
- Texto plano: sin markdown, sin títulos con #, sin negritas. Podés usar guiones "- " para listar ítems.
- Respondé solo con el resumen, sin introducción ni comentarios.`;

// Nutricionistas: el foco es la evolución del peso, la alimentación y la
// adherencia al plan.
const SYSTEM_PROMPTS_NUTRICION: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas de nutrición. Vas a recibir la transcripción de un dictado de un nutricionista sobre la historia del peso y la alimentación de un paciente. Resumila en un párrafo breve (o pocos ítems) con lo clínicamente relevante: motivo de consulta, evolución del peso, dietas o tratamientos previos y sus resultados, hábitos alimentarios, actividad física, enfermedades que condicionen la alimentación y lo que espera lograr.

${REGLAS_NUTRICION}`,
  evolucion: `Sos un asistente que redacta historias clínicas de nutrición. Vas a recibir la transcripción de un dictado de un nutricionista sobre un control. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refiere el paciente, peso y medidas del día, adherencia al plan y dificultades, cambios en la alimentación y la actividad física, ajustes al plan alimentario, objetivos y próximo control.

${REGLAS_NUTRICION}`,
};

// Oftalmología, ORL y dermatología: las reglas médicas comunes, con lo que
// cada examen tiene que conservar exacto.
const REGLAS_OFTALMOLOGIA = `${REGLAS_COMUNES}
- Conservá exactos, ojo por ojo (OD / OI), la agudeza visual, la refracción (esfera, cilindro, eje), la presión intraocular y la relación excavación/papila.`;

const REGLAS_ORL = `${REGLAS_COMUNES}
- Conservá exacto de qué lado es cada hallazgo (oído o fosa nasal derecha o izquierda), los resultados de Weber y Rinne, los umbrales de audiometría y el grado de las amígdalas.`;

const REGLAS_DERMATOLOGIA = `${REGLAS_COMUNES}
- Conservá exactos la lesión elemental, la localización, el tamaño, el color, los bordes y los hallazgos de la dermatoscopía, tal como los describe el dermatólogo.`;

const SYSTEM_PROMPTS_OFTALMOLOGIA: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas oftalmológicas. Vas a recibir la transcripción de un dictado de un oftalmólogo sobre la enfermedad actual de un paciente. Resumila en un párrafo breve (o pocos ítems) con lo clínicamente relevante: qué ojo, inicio y evolución de los síntomas visuales, dolor, ojo rojo, antecedentes oculares y tratamientos que usó.

${REGLAS_OFTALMOLOGIA}`,
  evolucion: `Sos un asistente que redacta historias clínicas oftalmológicas. Vas a recibir la transcripción de un dictado de un oftalmólogo sobre una consulta. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refiere el paciente, agudeza visual, refracción, presión intraocular, biomicroscopía, fondo de ojo, diagnóstico, indicaciones (gotas, anteojos, estudios) y próximo control.

${REGLAS_OFTALMOLOGIA}`,
};

const SYSTEM_PROMPTS_ORL: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas otorrinolaringológicas. Vas a recibir la transcripción de un dictado de un otorrinolaringólogo sobre la enfermedad actual de un paciente. Resumila en un párrafo breve (o pocos ítems) con lo clínicamente relevante: lado, inicio y evolución de los síntomas (oído, nariz, garganta, voz, equilibrio), episodios previos y tratamientos que recibió.

${REGLAS_ORL}`,
  evolucion: `Sos un asistente que redacta historias clínicas otorrinolaringológicas. Vas a recibir la transcripción de un dictado de un otorrinolaringólogo sobre una consulta. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refiere el paciente, otoscopía, acumetría y audiometría, rinoscopía, orofaringe, laringoscopía, cuello, diagnóstico, indicaciones y próximo control.

${REGLAS_ORL}`,
};

const SYSTEM_PROMPTS_DERMATOLOGIA: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas dermatológicas. Vas a recibir la transcripción de un dictado de un dermatólogo sobre la enfermedad actual de un paciente. Resumila en un párrafo breve (o pocos ítems) con lo clínicamente relevante: desde cuándo, dónde empezó y cómo se extendió, síntomas (prurito, dolor, sangrado), cambios de la lesión, desencadenantes y tratamientos que usó.

${REGLAS_DERMATOLOGIA}`,
  evolucion: `Sos un asistente que redacta historias clínicas dermatológicas. Vas a recibir la transcripción de un dictado de un dermatólogo sobre una consulta. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refiere el paciente, lesiones (tipo, localización, descripción), dermatoscopía, respuesta al tratamiento, diagnóstico, indicaciones (tópicos, sistémicos, biopsia, fotoprotección) y próximo control.

${REGLAS_DERMATOLOGIA}`,
};

const REGLAS_LOCOMOTOR = `${REGLAS_COMUNES}
- Conservá exactos el lado (derecho o izquierdo), la región, la escala de dolor (EVA), los grados de movilidad, la fuerza (0 a 5), el resultado de cada maniobra y el recuento articular.`;

const REGLAS_ONCOLOGIA = `${REGLAS_COMUNES}
- Conservá exactos el tipo histológico, la estadificación (TNM, estadio), el esquema y número de ciclo, las dosis, el ECOG, los valores del hemograma y las toxicidades con su grado.`;

const SYSTEM_PROMPTS_LOCOMOTOR: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas de traumatología, reumatología y rehabilitación. Vas a recibir la transcripción de un dictado de un médico sobre la enfermedad actual de un paciente. Resumila en un párrafo breve (o pocos ítems) con lo clínicamente relevante: región y lado, mecanismo, desde cuándo, características del dolor, limitación funcional y tratamientos recibidos.

${REGLAS_LOCOMOTOR}`,
  evolucion: `Sos un asistente que redacta historias clínicas de traumatología, reumatología y rehabilitación. Vas a recibir la transcripción de un dictado de un médico sobre una consulta. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refiere el paciente, dolor (EVA), examen de la región (inspección, palpación, movilidad, fuerza, maniobras), funcionalidad, estudios, diagnóstico, indicaciones y próximo control.

${REGLAS_LOCOMOTOR}`,
};

const SYSTEM_PROMPTS_ONCOLOGIA: Record<z.infer<typeof resumirInput>["tipo"], string> = {
  antecedentes: `Sos un asistente que redacta historias clínicas de oncología, hematología y cuidados paliativos. Vas a recibir la transcripción de un dictado de un médico sobre la enfermedad actual de un paciente. Resumila en un párrafo breve (o pocos ítems) con lo clínicamente relevante: diagnóstico y estadificación, fecha del diagnóstico, tratamientos recibidos y su respuesta, síntomas actuales y toxicidades.

${REGLAS_ONCOLOGIA}`,
  evolucion: `Sos un asistente que redacta historias clínicas de oncología, hematología y cuidados paliativos. Vas a recibir la transcripción de un dictado de un médico sobre una consulta. Resumila con lo clínicamente relevante, en este orden y omitiendo lo que no se mencione: lo que refiere el paciente, estado general (ECOG), síntomas y toxicidades con su grado, examen, laboratorio, respuesta al tratamiento, conducta (esquema, ciclo, ajustes de dosis, soporte) y próximo control.

${REGLAS_ONCOLOGIA}`,
};

const SYSTEM_PROMPTS_POR_GRUPO: Record<
  GrupoEspecialidad,
  Record<z.infer<typeof resumirInput>["tipo"], string>
> = {
  MEDICA: SYSTEM_PROMPTS,
  PEDIATRICA: SYSTEM_PROMPTS_PEDIATRIA,
  GINECOLOGICA: SYSTEM_PROMPTS_GINECOLOGIA,
  PSIQUIATRICA: SYSTEM_PROMPTS_PSIQUIATRIA,
  NUTRICION: SYSTEM_PROMPTS_NUTRICION,
  OFTALMOLOGICA: SYSTEM_PROMPTS_OFTALMOLOGIA,
  ORL: SYSTEM_PROMPTS_ORL,
  DERMATOLOGICA: SYSTEM_PROMPTS_DERMATOLOGIA,
  LOCOMOTOR: SYSTEM_PROMPTS_LOCOMOTOR,
  ONCOLOGICA: SYSTEM_PROMPTS_ONCOLOGIA,
  ODONTOLOGICA: SYSTEM_PROMPTS_ODONTOLOGIA,
  PSICOLOGIA: SYSTEM_PROMPTS_PSICOLOGIA,
  FONOAUDIOLOGIA: SYSTEM_PROMPTS_FONOAUDIOLOGIA,
};

export async function POST(request: NextRequest) {
  const { user, response } = await requirePremiumDoctor();
  if (response) return response;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[ia/resumir] Falta ANTHROPIC_API_KEY");
    return NextResponse.json({ error: "El resumen con IA no está configurado." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = resumirInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const limites = limitesDictado(user.especialidad);
  if (parsed.data.texto.length > limites.maxCaracteresResumen) {
    return NextResponse.json({ error: "El texto es demasiado largo para resumir." }, { status: 400 });
  }

  // Se reserva el costo máximo antes de llamar (ver src/lib/ia-tope.ts): un
  // pedido simultáneo ya lo ve y no puede pasar el tope junto con este.
  const reservaId = await reservarUsoIA(
    user,
    "RESUMEN",
    costoResumenMaximoUsd(parsed.data.texto.length, limites.maxTokensResumen)
  );
  if (!reservaId) {
    return NextResponse.json({ error: mensajeTopeIA(), code: CODIGO_TOPE_IA }, { status: 429 });
  }

  // Dentro del grupo médico, una regla más con lo que la especialidad
  // necesita conservar exacto.
  const grupo = grupoEspecialidad(user.especialidad);
  const reglaEspecialidad = grupo === "MEDICA" && user.especialidad ? REGLA_RESUMEN[user.especialidad] : undefined;
  const systemPrompt =
    SYSTEM_PROMPTS_POR_GRUPO[grupo][parsed.data.tipo] + (reglaEspecialidad ? `\n${reglaEspecialidad}` : "");

  let message: Anthropic.Message;
  try {
    // Se crea por pedido: el constructor falla sin ANTHROPIC_API_KEY, y a nivel de
    // módulo eso rompería el build en entornos sin la variable.
    const client = new Anthropic();
    message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: limites.maxTokensResumen,
      system: systemPrompt,
      messages: [{ role: "user", content: `<dictado>\n${parsed.data.texto}\n</dictado>` }],
    });
  } catch (error) {
    // El pedido falló sin respuesta: no hay consumo que registrar.
    await liberarUsoIA(reservaId);
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Hay muchos pedidos en este momento. Probá de nuevo en unos segundos." },
        { status: 429 }
      );
    }
    console.error("[ia/resumir] Error llamando a Anthropic", error);
    return NextResponse.json({ error: "No se pudo generar el resumen." }, { status: 502 });
  }

  // Con respuesta, los tokens se pagaron aunque se haya negado o venga vacía.
  const { input_tokens: tokensEntrada, output_tokens: tokensSalida } = message.usage;
  await confirmarUsoIA(reservaId, {
    tokensEntrada,
    tokensSalida,
    costoUsd: costoResumenUsd(tokensEntrada, tokensSalida),
  });

  if (message.stop_reason === "refusal") {
    return NextResponse.json({ error: "No se pudo generar el resumen." }, { status: 502 });
  }

  const resumen = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  if (!resumen) {
    return NextResponse.json({ error: "No se pudo generar el resumen." }, { status: 502 });
  }

  return NextResponse.json({ resumen });
}
