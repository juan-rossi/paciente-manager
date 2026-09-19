import { NextRequest, NextResponse } from "next/server";
import { fetchPlaceDetails } from "@/lib/google-places";

// Pública, igual que /api/directorio/ciudad-autocomplete -- solo expone
// coordenadas de una ciudad ya elegida de la lista de sugerencias, no datos
// de ningún médico.
export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId) {
    return NextResponse.json({ error: "Falta el ID del lugar." }, { status: 400 });
  }

  const result = await fetchPlaceDetails(placeId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ciudad: result.ciudad, latitud: result.latitud, longitud: result.longitud });
}
