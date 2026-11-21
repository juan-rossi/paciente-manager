import { NextRequest, NextResponse } from "next/server";
import { CODIGO_TOPE_IA, requirePremiumDoctor } from "@/lib/ia-auth";
import { costoDictadoMaximoUsd, costoDictadoUsd } from "@/lib/ia-costos";
import { confirmarUsoIA, liberarUsoIA, mensajeTopeIA, reservarUsoIA } from "@/lib/ia-tope";
import { grupoEspecialidad, type GrupoEspecialidad } from "@/lib/especialidad";

export const maxDuration = 60;

const GROQ_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// Vercel corta el body de una función en 4,5 MB; el cliente graba a ~24 kbps y
// sube la grabación en segmentos de hasta 10 minutos (≈1,8 MB cada uno, aunque
// un psicólogo dicte una hora entera), así que esto es solo un tope de
// seguridad.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

// Whisper toma el `prompt` como si fuera transcripción previa, sesgando el
// vocabulario: este fragmento clínico mejoró los términos médicos en las
// pruebas del viejo transcriptor local (whisper.cpp, ya retirado).
const PROMPT_CLINICO =
  "Evolución clínica en español. Antecedentes: hipertensión arterial, diabetes tipo 2, dislipemia, hipotiroidismo. Medicación habitual: enalapril, losartán, atorvastatina, metformina, paracetamol, ibuprofeno, amoxicilina, omeprazol, levotiroxina. El paciente refiere dolor, fiebre, cefalea y mareos. Se indica tratamiento y control en una semana.";

// Para psicólogos: vocabulario de sesión en vez de fármacos.
const PROMPT_PSICOLOGIA =
  "Sesión de psicoterapia en español. El consultante refiere ansiedad, angustia, ataques de pánico, insomnio y dificultades en el vínculo con su pareja y su familia. Se trabaja el duelo, la autoestima y los pensamientos intrusivos. Se mantiene el encuadre, se acuerdan tareas y se pauta la próxima sesión.";

// Para odontólogos: piezas en notación FDI, caras y prácticas del nomenclador.
const PROMPT_ODONTOLOGIA =
  "Consulta odontológica en español. Pieza 3.6 con caries en cara oclusal y distal, se realiza obturación con composite. Pieza 1.1 con fractura de cara vestibular y mesial. Pieza 4.6 con tratamiento de conducto, se indica corona. Exodoncia de la pieza 3.8. Tartrectomía y topicación con flúor. Periodontitis, gingivitis, bolsa periodontal, movilidad dentaria. Anestesia local, implante, amalgama, radiografía periapical y panorámica. Cara palatina, lingual, vestibular, mesial, distal, oclusal.";

// Para fonoaudiólogos: trastornos de lenguaje, habla, voz, audición y
// deglución, con los nombres de las pruebas más usadas.
const PROMPT_FONOAUDIOLOGIA =
  "Sesión de fonoaudiología en español. Paciente con dislalia, sustituye el fonema /r/ por /l/ y omite /s/ en sílabas trabadas. Retraso simple del lenguaje, trastorno específico del lenguaje, TEA, tartamudez, disfemia, disfonía, nódulos vocales, disfagia, deglución atípica, respiración bucal, praxias linguales y labiales, conciencia fonológica, lectoescritura, dislexia. Audiometría tonal, logoaudiometría, impedanciometría, otoemisiones acústicas, hipoacusia neurosensorial, audífonos, implante coclear. Se indican ejercicios para el hogar.";

// Para pediatras: el relato es de los padres, la medicación va por peso y se
// habla de percentiles, vacunas y desarrollo.
const PROMPT_PEDIATRIA =
  "Consulta pediátrica en español. La mamá refiere fiebre de 38,5 grados desde hace dos días, tos, rinorrea, vómitos y diarrea. Come poco pero toma líquidos y orina bien. Peso 12,4 kilos, talla 86 centímetros, perímetro cefálico 47, percentil 50. Bronquiolitis, otitis media aguda, faringoamigdalitis, broncoespasmo, gastroenteritis, deshidratación, convulsión febril. Calendario de vacunas completo. Pautas madurativas acordes. Se indica ibuprofeno 10 miligramos por kilo cada 8 horas, amoxicilina 80 miligramos por kilo por día, salbutamol, nebulizaciones y control en 48 horas.";

// Para ginecólogos y obstetras: fórmula obstétrica, controles y estudios.
const PROMPT_GINECOLOGIA =
  "Consulta ginecológica en español. Fecha de última menstruación 3 de marzo, ciclos de 28 por 5 días. Gestas 2, partos 1, cesáreas 1, abortos 0. Embarazo de 24 semanas, altura uterina 23 centímetros, latidos cardíacos fetales positivos, movimientos fetales presentes, tensión arterial 110/70. Flujo, dismenorrea, metrorragia, amenorrea, endometriosis, mioma, quiste de ovario, síndrome de ovario poliquístico, menopausia. PAP y colposcopía normales, HPV, ecografía transvaginal, mamografía BI-RADS 2. Anticonceptivos orales, DIU, implante subdérmico, ácido fólico, sulfato ferroso.";

// Para psiquiatras: examen psíquico y psicofármacos.
const PROMPT_PSIQUIATRIA =
  "Consulta psiquiátrica en español. Paciente lúcido, orientado en tiempo y espacio, hipoprosexia, humor depresivo, afecto congruente, ideas de muerte sin ideación suicida estructurada, sin alteraciones sensoperceptivas, insomnio de conciliación, hiporexia, juicio conservado, con conciencia de enfermedad. Trastorno depresivo mayor, trastorno bipolar, trastorno de ansiedad generalizada, esquizofrenia, TOC, TDAH, ataques de pánico. Sertralina 50 miligramos, escitalopram, fluoxetina, venlafaxina, quetiapina, olanzapina, risperidona, aripiprazol, litio, litemia, ácido valproico, lamotrigina, clonazepam, alprazolam, lorazepam, metilfenidato. Se ajusta la dosis y se pauta control en 15 días.";

// Para nutricionistas: antropometría, anamnesis alimentaria y planes.
const PROMPT_NUTRICION =
  "Consulta de nutrición en español. Peso actual 82,4 kilos, talla 1,65, IMC 30,3, circunferencia de cintura 98 centímetros. Realiza cuatro comidas, saltea el desayuno, picotea a la tarde, consume gaseosas y ultraprocesados, poca fruta y verdura, dos litros de agua. Recordatorio de 24 horas: mate con galletitas, milanesa con puré, yogur, fideos. Sedentarismo, camina 30 minutos tres veces por semana. Celiaquía, dieta sin TACC, intolerancia a la lactosa, resistencia a la insulina, hígado graso, dislipemia. Plan hipocalórico de 1500 kilocalorías, plato saludable, proteínas, hidratos de carbono, grasas, fibra, porciones. Control en 15 días.";

const PROMPT_POR_GRUPO: Record<GrupoEspecialidad, string> = {
  NUTRICION: PROMPT_NUTRICION,
  PSIQUIATRICA: PROMPT_PSIQUIATRIA,
  GINECOLOGICA: PROMPT_GINECOLOGIA,
  MEDICA: PROMPT_CLINICO,
  PEDIATRICA: PROMPT_PEDIATRIA,
  ODONTOLOGICA: PROMPT_ODONTOLOGIA,
  PSICOLOGIA: PROMPT_PSICOLOGIA,
  FONOAUDIOLOGIA: PROMPT_FONOAUDIOLOGIA,
};

export async function POST(request: NextRequest) {
  const { user, response } = await requirePremiumDoctor();
  if (response) return response;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[ia/transcribir] Falta GROQ_API_KEY");
    return NextResponse.json({ error: "El dictado no está configurado." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No se recibió audio." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "La grabación es demasiado larga." }, { status: 413 });
  }

  const nombre = audio.type.includes("mp4") ? "dictado.mp4" : "dictado.webm";
  const groqForm = new FormData();
  groqForm.append("file", audio, nombre);
  groqForm.append("model", "whisper-large-v3-turbo");
  groqForm.append("language", "es");
  // verbose_json suma `duration` (segundos de audio), que se registra para
  // el reporte de costos del panel admin.
  groqForm.append("response_format", "verbose_json");
  groqForm.append("temperature", "0");
  groqForm.append("prompt", PROMPT_POR_GRUPO[grupoEspecialidad(user.especialidad)]);

  // Se reserva el costo máximo antes de llamar (ver src/lib/ia-tope.ts): un
  // pedido simultáneo ya lo ve y no puede pasar el tope junto con este.
  const reservaId = await reservarUsoIA(user, "DICTADO", costoDictadoMaximoUsd(audio.size));
  if (!reservaId) {
    return NextResponse.json({ error: mensajeTopeIA(), code: CODIGO_TOPE_IA }, { status: 429 });
  }

  try {
    const groqResponse = await fetch(GROQ_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });
    if (!groqResponse.ok) {
      // Groq no factura un pedido que rechazó.
      await liberarUsoIA(reservaId);
      console.error(
        "[ia/transcribir] Groq respondió",
        groqResponse.status,
        await groqResponse.text().catch(() => "")
      );
      return NextResponse.json({ error: "No se pudo transcribir el audio." }, { status: 502 });
    }
    const data = (await groqResponse.json()) as { text?: string; duration?: number };
    const segundosAudio = Math.round(data.duration ?? 0);
    await confirmarUsoIA(reservaId, { segundosAudio, costoUsd: costoDictadoUsd(segundosAudio) });
    return NextResponse.json({ texto: (data.text ?? "").trim() });
  } catch (error) {
    await liberarUsoIA(reservaId);
    console.error("[ia/transcribir] Error llamando a Groq", error);
    return NextResponse.json({ error: "No se pudo transcribir el audio." }, { status: 502 });
  }
}
