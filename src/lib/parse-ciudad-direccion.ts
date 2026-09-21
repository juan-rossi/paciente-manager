// Heurística para inferir la ciudad a partir de una `direccion` ya
// geocodeada por Google Places (formato típico en Argentina: "<calle>,
// <CPA> <ciudad>, Argentina", a veces sin el CPA o sin el ", Argentina"
// final). Se usa para completar `LugarDeTrabajo.ciudad` en filas cargadas
// antes de que ese campo existiera (ver scripts/backfill-lugar-ciudad.ts) --
// nunca para direcciones nuevas, que ya traen `ciudad` directo de
// `AddressAutocomplete`.
export function parseCiudadDeDireccion(direccion: string): string | null {
  const partes = direccion
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (partes.length < 2) return null;

  const ultima = partes[partes.length - 1];
  const candidata = /^argentina$/i.test(ultima) ? partes[partes.length - 2] : ultima;
  if (!candidata) return null;

  // CPA (Código Postal Argentino): una letra + 4 dígitos + hasta 3 letras.
  const sinCPA = candidata.replace(/^[A-Za-z]\d{4}[A-Za-z]{0,3}\s+/, "").trim();
  return sinCPA || null;
}
