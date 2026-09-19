import { NextRequest, NextResponse } from "next/server";
import { requireDoctor } from "@/lib/api-auth";

type AddressComponent = {
  longText?: string;
  types?: string[];
};

// `locality` es lo que Google llama "ciudad" en la mayoría de las
// direcciones argentinas; si no viene (zonas rurales, algunos barrios de
// CABA), se cae a `administrative_area_level_2` y después
// `administrative_area_level_1` como mejor aproximación disponible.
function extraerCiudad(components: AddressComponent[]): string | null {
  const porTipo = (tipo: string) =>
    components.find((c) => c.types?.includes(tipo))?.longText ?? null;

  return (
    porTipo("locality") ??
    porTipo("administrative_area_level_2") ??
    porTipo("administrative_area_level_1") ??
    null
  );
}

export async function GET(request: NextRequest) {
  const { response } = await requireDoctor();
  if (response) return response;

  const placeId = request.nextUrl.searchParams.get("placeId")?.trim();
  if (!placeId) {
    return NextResponse.json({ error: "Falta el ID del lugar." }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Autocompletado no configurado." }, { status: 503 });
  }

  const googleResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "formattedAddress,addressComponents,location",
    },
  });

  if (!googleResponse.ok) {
    return NextResponse.json({ error: "No se pudo obtener la dirección." }, { status: 502 });
  }

  const data = await googleResponse.json();

  return NextResponse.json({
    direccion: data.formattedAddress ?? null,
    ciudad: extraerCiudad(data.addressComponents ?? []),
    latitud: data.location?.latitude ?? null,
    longitud: data.location?.longitude ?? null,
  });
}
