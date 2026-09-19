"use client";

import { useRef, useState } from "react";
import { XIcon } from "lucide-react";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxItem,
} from "@/components/ui/combobox";

type Suggestion = { placeId: string; text: string };

export type CiudadResult = { ciudad: string; latitud: number; longitud: number };

type Props = {
  id?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (result: CiudadResult) => void;
  onClear: () => void;
  className?: string;
  groupClassName?: string;
};

export function CiudadAutocomplete({
  id,
  value,
  onChangeText,
  onSelect,
  onClear,
  className,
  groupClassName,
}: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleInputValueChange(text: string, eventDetails?: { reason?: string }) {
    // Al elegir una sugerencia, el combobox cierra el popup y -- como nunca
    // le pasamos un `value` real (todo el manejo de texto es nuestro, ver
    // `value={null}` más abajo) -- interpreta que "no hubo selección" y
    // limpia el input solo (reason "input-clear"), justo antes de que
    // `handleValueChange` complete el fetch de detalle y confirme el texto
    // final. Eso se veía como un parpadeo: texto elegido -> vacío -> texto
    // final. Ese clear es siempre espurio acá (el nuestro, con el botón de
    // limpiar, no pasa por este handler), así que se ignora.
    if (eventDetails?.reason === "input-clear") return;
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/directorio/ciudad-autocomplete?input=${encodeURIComponent(text)}`);
        if (!response.ok) return;
        const data = await response.json();
        setSuggestions(data.suggestions ?? []);
      } catch {
        /* deja de sugerir hasta el próximo debounce */
      }
    }, 300);
  }

  async function handleValueChange(item: Suggestion | null) {
    if (!item) return;
    onChangeText(item.text);
    setSuggestions([]);
    try {
      const response = await fetch(`/api/directorio/ciudad-detalle?placeId=${encodeURIComponent(item.placeId)}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.latitud != null && data.longitud != null) {
        onSelect({ ciudad: data.ciudad ?? item.text, latitud: data.latitud, longitud: data.longitud });
      }
    } catch {
      /* la ciudad queda cargada como texto, sin filtrar por distancia */
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
      <ComboboxInputGroup className={groupClassName}>
        <ComboboxInput id={id} placeholder="Todas las ciudades" className={className} />
        {value !== "" && (
          <button
            type="button"
            aria-label="Limpiar ciudad"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onChangeText("");
              onClear();
            }}
            className="absolute right-7 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            <XIcon className="pointer-events-none size-4" />
          </button>
        )}
        <ComboboxTrigger aria-label="Abrir sugerencias" />
      </ComboboxInputGroup>
      <ComboboxContent>
        {(item: Suggestion) => <ComboboxItem key={item.placeId} value={item}>{item.text}</ComboboxItem>}
      </ComboboxContent>
    </Combobox>
  );
}
