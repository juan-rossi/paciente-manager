import { NextRequest, NextResponse } from "next/server";
import { requirePremiumDoctor } from "@/lib/ia-auth";
import { registrarDictado } from "@/lib/ia-costos";

export const maxDuration = 60;

const GROQ_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// Vercel corta el body de una función en 4,5 MB; el cliente graba a ~24 kbps y
// se detiene solo a los 10 minutos (≈1,8 MB), así que esto es solo un tope de
// seguridad.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

// Whisper toma el `prompt` como si fuera transcripción previa, sesgando el
// vocabulario: mismo fragmento clínico que ya mejoró los términos médicos en
// el transcriptor local (whisper-service/src/asr/engine.ts).
const PROMPT_CLINICO =
  "Evolución clínica en español. Antecedentes: hipertensión arterial, diabetes tipo 2, dislipemia, hipotiroidismo. Medicación habitual: enalapril, losartán, atorvastatina, metformina, paracetamol, ibuprofeno, amoxicilina, omeprazol, levotiroxina. El paciente refiere dolor, fiebre, cefalea y mareos. Se indica tratamiento y control en una semana.";

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
  groqForm.append("prompt", PROMPT_CLINICO);

  try {
    const groqResponse = await fetch(GROQ_TRANSCRIPTIONS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });
    if (!groqResponse.ok) {
      console.error(
        "[ia/transcribir] Groq respondió",
        groqResponse.status,
        await groqResponse.text().catch(() => "")
      );
      return NextResponse.json({ error: "No se pudo transcribir el audio." }, { status: 502 });
    }
    const data = (await groqResponse.json()) as { text?: string; duration?: number };
    await registrarDictado(user.id, Math.round(data.duration ?? 0));
    return NextResponse.json({ texto: (data.text ?? "").trim() });
  } catch (error) {
    console.error("[ia/transcribir] Error llamando a Groq", error);
    return NextResponse.json({ error: "No se pudo transcribir el audio." }, { status: 502 });
  }
}
