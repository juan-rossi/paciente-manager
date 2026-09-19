import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/api-auth";

// Proxy server-side a Places API (New) -- la key nunca llega al cliente.
// Requiere sesión (mismo criterio que el resto de /api/perfil/*) para que
// no cualquiera pueda gastar la cuota de la cuenta de Google.
export async function GET(request: NextRequest) {
  const { response } = await requireDoctor();
  if (response) return response;

  const input = request.nextUrl.searchParams.get("input")?.trim();
  if (!input || input.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Autocompletado no configurado." }, { status: 503 });
  }

  const googleResponse = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input,
      languageCode: "es",
      includedRegionCodes: ["ar"],
    }),
  });

  if (!googleResponse.ok) {
    return NextResponse.json({ error: "No se pudo buscar la dirección." }, { status: 502 });
  }

  const data = await googleResponse.json();
  const suggestions = (data.suggestions ?? [])
    .map((s: { placePrediction?: { placeId?: string; text?: { text?: string } } }) => {
      const prediction = s.placePrediction;
      if (!prediction?.placeId || !prediction.text?.text) return null;
      return { placeId: prediction.placeId, text: prediction.text.text };
    })
    .filter((s: unknown) => s !== null);

  return NextResponse.json({ suggestions });
}
