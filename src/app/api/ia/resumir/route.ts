import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePremiumDoctor } from "@/lib/ia-auth";
import { registrarResumen } from "@/lib/ia-costos";
import { esPsicologia, limitesDictado } from "@/lib/especialidad";

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

  const psicologia = esPsicologia(user.especialidad);
  const limites = limitesDictado(user.especialidad);
  if (parsed.data.texto.length > limites.maxCaracteresResumen) {
    return NextResponse.json({ error: "El texto es demasiado largo para resumir." }, { status: 400 });
  }

  try {
    // Se crea por pedido: el constructor falla sin ANTHROPIC_API_KEY, y a nivel de
    // módulo eso rompería el build en entornos sin la variable.
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: limites.maxTokensResumen,
      system: (psicologia ? SYSTEM_PROMPTS_PSICOLOGIA : SYSTEM_PROMPTS)[parsed.data.tipo],
      messages: [{ role: "user", content: `<dictado>\n${parsed.data.texto}\n</dictado>` }],
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

    await registrarResumen(user.id, message.usage.input_tokens, message.usage.output_tokens);
    return NextResponse.json({ resumen });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Hay muchos pedidos en este momento. Probá de nuevo en unos segundos." },
        { status: 429 }
      );
    }
    console.error("[ia/resumir] Error llamando a Anthropic", error);
    return NextResponse.json({ error: "No se pudo generar el resumen." }, { status: 502 });
  }
}
