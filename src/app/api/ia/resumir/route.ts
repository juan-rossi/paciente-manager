import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePremiumDoctor } from "@/lib/ia-auth";
import { registrarResumen } from "@/lib/ia-costos";

export const maxDuration = 60;

const resumirInput = z.object({
  texto: z.string().trim().min(1, "No hay texto para resumir.").max(20_000),
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

  try {
    // Se crea por pedido: el constructor falla sin ANTHROPIC_API_KEY, y a nivel de
    // módulo eso rompería el build en entornos sin la variable.
    const client = new Anthropic();
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPTS[parsed.data.tipo],
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
