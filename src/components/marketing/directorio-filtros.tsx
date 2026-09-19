"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxClear,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxItem,
} from "@/components/ui/combobox";
import { ESPECIALIDAD_OPTIONS } from "@/lib/especialidad";
import { CiudadAutocomplete, type CiudadResult } from "@/components/marketing/ciudad-autocomplete";

// "Todas las especialidades" no es una opción de la lista, sino el estado
// "sin elegir" del combobox (value null) con este placeholder -- así el
// input arranca vacío y se puede tipear para filtrar de una, en vez de tener
// que primero borrar un texto ya cargado. Se saca del query string al armar
// la URL. La ciudad no lo necesita: "" ya significa "todas".
const TODAS = "__todas__";

type EspecialidadOption = (typeof ESPECIALIDAD_OPTIONS)[number];

export function DirectorioFiltros() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [especialidad, setEspecialidad] = useState(searchParams.get("especialidad") ?? TODAS);
  const [ciudad, setCiudad] = useState(searchParams.get("ciudad") ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    return lat && lng ? { lat: Number(lat), lng: Number(lng) } : null;
  });

  // Cada filtro busca apenas cambia -- por eso recibe los valores nuevos por
  // parámetro en vez de leerlos del estado, que todavía no se actualizó
  // cuando se dispara la búsqueda.
  function buscar(next: { especialidad: string; ciudad: string; coords: { lat: number; lng: number } | null }) {
    const params = new URLSearchParams();
    if (next.especialidad !== TODAS) params.set("especialidad", next.especialidad);
    // Solo filtra por distancia cuando la ciudad se eligió de la lista de
    // sugerencias (tenemos coordenadas) -- texto libre sin seleccionar no
    // alcanza para calcular distancias, así que se ignora.
    if (next.ciudad.trim() && next.coords) {
      params.set("ciudad", next.ciudad.trim());
      params.set("lat", String(next.coords.lat));
      params.set("lng", String(next.coords.lng));
    }
    const qs = params.toString();
    router.push(`/directorio${qs ? `?${qs}` : ""}`);
  }

  function handleEspecialidadChange(value: string) {
    setEspecialidad(value);
    buscar({ especialidad: value, ciudad, coords });
  }

  function handleCiudadTextChange(text: string) {
    setCiudad(text);
    setCoords(null);
  }

  function handleCiudadSelect(result: CiudadResult) {
    const nextCoords = { lat: result.latitud, lng: result.longitud };
    setCiudad(result.ciudad);
    setCoords(nextCoords);
    buscar({ especialidad, ciudad: result.ciudad, coords: nextCoords });
  }

  function handleCiudadClear() {
    setCiudad("");
    setCoords(null);
    buscar({ especialidad, ciudad: "", coords: null });
  }

  return (
    <div className="mx-auto mt-8 flex max-w-2xl flex-wrap gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-lg shadow-primary/10">
      <Combobox
        items={ESPECIALIDAD_OPTIONS}
        value={ESPECIALIDAD_OPTIONS.find((o) => o.value === especialidad) ?? null}
        onValueChange={(item) => handleEspecialidadChange((item as EspecialidadOption | null)?.value ?? TODAS)}
      >
        <ComboboxInputGroup className="flex-1 min-w-[170px]">
          <ComboboxInput id="directorio-especialidad" placeholder="Todas las especialidades" className="h-11" />
          <ComboboxClear aria-label="Limpiar especialidad" />
          <ComboboxTrigger aria-label="Abrir especialidades" />
        </ComboboxInputGroup>
        <ComboboxContent>
          {(option: EspecialidadOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxContent>
      </Combobox>

      <CiudadAutocomplete
        id="directorio-ciudad"
        value={ciudad}
        onChangeText={handleCiudadTextChange}
        onSelect={handleCiudadSelect}
        onClear={handleCiudadClear}
        className="h-11"
        groupClassName="flex-1 min-w-[150px]"
      />
    </div>
  );
}
