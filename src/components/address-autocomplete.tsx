"use client";

import { useRef, useState } from "react";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxItem,
} from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

type Suggestion = { placeId: string; text: string };

export type AddressResult = {
  direccion: string;
  ciudad: string | null;
  latitud: number | null;
  longitud: number | null;
};

type Props = {
  id?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (result: AddressResult) => void;
  className?: string;
};

// Combobox con datos remotos (autocompletado de Google Places) en vez de la
// lista fija que usa, p.ej., el de especialidad -- `filter={null}` porque
// Google ya devuelve las sugerencias filtradas/ordenadas, no hace falta
// filtrar de nuevo del lado del cliente.
export function AddressAutocomplete({ id, value, onChangeText, onSelect, className }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleInputValueChange(text: string) {
    onChangeText(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(text)}`);
        if (!response.ok) return;
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        // Sin conexión momentánea: se deja de sugerir, el usuario puede
        // seguir escribiendo y se reintenta en el próximo debounce.
      }
    }, 300);
  }

  async function handleValueChange(item: Suggestion | null) {
    if (!item) return;
    onChangeText(item.text);
    setSuggestions([]);
    try {
      const response = await fetch(`/api/places/details?placeId=${encodeURIComponent(item.placeId)}`);
      if (!response.ok) return;
      const data = await response.json();
      onSelect({
        direccion: data.direccion ?? item.text,
        ciudad: data.ciudad ?? null,
        latitud: data.latitud ?? null,
        longitud: data.longitud ?? null,
      });
    } catch {
      // Si falla el detalle, el texto elegido ya quedó cargado -- ciudad y
      // coordenadas simplemente no se completan (la validación de
      // "Información pública" lo va a pedir de nuevo).
    }
  }

  return (
    <Combobox
      items={suggestions}
      inputValue={value}
      onInputValueChange={handleInputValueChange}
      value={null}
      onValueChange={(item) => handleValueChange(item as Suggestion | null)}
      filter={null}
      itemToStringValue={(item: Suggestion) => item.text}
      itemToStringLabel={(item: Suggestion) => item.text}
    >
      <ComboboxInputGroup>
        <ComboboxInput
          id={id}
          placeholder="Empezá a escribir una dirección..."
          className={cn("pr-14", className)}
        />
        <ComboboxTrigger aria-label="Abrir sugerencias" />
      </ComboboxInputGroup>
      <ComboboxContent>
        {(item: Suggestion) => (
          <ComboboxItem key={item.placeId} value={item}>
            {item.text}
          </ComboboxItem>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
