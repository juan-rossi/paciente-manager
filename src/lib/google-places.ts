// Wrappers server-side sobre Places API (New) de Google -- la key nunca llega
// al cliente, solo se usa desde las rutas de /api/places/* (autenticadas) y
// /api/directorio/* (públicas, para el buscador de ciudades del directorio).

export type PlaceSuggestion = { placeId: string; text: string };

type AutocompleteResult = { suggestions: PlaceSuggestion[] } | { error: string; status: number };

export async function fetchPlaceSuggestions(
  input: string,
  options?: { includedPrimaryTypes?: string[] }
): Promise<AutocompleteResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { error: "Autocompletado no configurado.", status: 503 };
  }

  const googleResponse = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
    body: JSON.stringify({
      input,
      languageCode: "es",
      includedRegionCodes: ["ar"],
      ...(options?.includedPrimaryTypes ? { includedPrimaryTypes: options.includedPrimaryTypes } : {}),
    }),
  });

  if (!googleResponse.ok) {
    return { error: "No se pudo buscar la dirección.", status: 502 };
  }

  const data = await googleResponse.json();
  const suggestions: PlaceSuggestion[] = (data.suggestions ?? [])
    .map((s: { placePrediction?: { placeId?: string; text?: { text?: string } } }) => {
      const prediction = s.placePrediction;
      if (!prediction?.placeId || !prediction.text?.text) return null;
      return { placeId: prediction.placeId, text: prediction.text.text };
    })
    .filter((s: PlaceSuggestion | null): s is PlaceSuggestion => s !== null);

  return { suggestions };
}

type AddressComponent = { longText?: string; types?: string[] };

type PlaceDetailsResult =
  | { direccion: string | null; ciudad: string | null; latitud: number | null; longitud: number | null }
  | { error: string; status: number };

function extraerCiudad(components: AddressComponent[]): string | null {
  const porTipo = (tipo: string) => components.find((c) => c.types?.includes(tipo))?.longText ?? null;
  return (
    porTipo("locality") ?? porTipo("administrative_area_level_2") ?? porTipo("administrative_area_level_1") ?? null
  );
}

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetailsResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return { error: "Autocompletado no configurado.", status: 503 };
  }

  const googleResponse = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "formattedAddress,addressComponents,location" },
  });

  if (!googleResponse.ok) {
    return { error: "No se pudo obtener la dirección.", status: 502 };
  }

  const data = await googleResponse.json();
  return {
    direccion: data.formattedAddress ?? null,
    ciudad: extraerCiudad(data.addressComponents ?? []),
    latitud: data.location?.latitude ?? null,
    longitud: data.location?.longitude ?? null,
  };
}
