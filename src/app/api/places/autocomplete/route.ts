import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/api-auth";
import { fetchPlaceSuggestions } from "@/lib/google-places";

// Requiere sesión (mismo criterio que el resto de /api/perfil/*) para que no
// cualquiera pueda gastar la cuota de la cuenta de Google.
export async function GET(request: NextRequest) {
  const { response } = await requireDoctor();
  if (response) return response;

  const input = request.nextUrl.searchParams.get("input")?.trim();
  if (!input || input.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  const result = await fetchPlaceSuggestions(input);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
