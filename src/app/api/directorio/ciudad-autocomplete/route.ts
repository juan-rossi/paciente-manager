import { NextRequest, NextResponse } from "next/server";
import { fetchPlaceSuggestions } from "@/lib/google-places";

// A diferencia de /api/places/autocomplete, esta ruta es pública a propósito
// -- el buscador de ciudades del directorio lo usan visitantes sin sesión.
// Restringido a resultados tipo "ciudad" para no devolver direcciones
// puntuales, y con un mínimo de largo de input para no gastar cuota de
// Google en cada tecla.
export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.trim();
  if (!input || input.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const result = await fetchPlaceSuggestions(input, { includedPrimaryTypes: ["locality"] });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
