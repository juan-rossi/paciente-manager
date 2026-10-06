"use client";

import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PARTICULAR = "__particular__";

type Props = {
  // "" = Particular (se guarda como NULL).
  value: string;
  onChange: (value: string) => void;
  prepagas: string[];
  triggerClassName?: string;
};

export function ObraSocialSelect({ value, onChange, prepagas, triggerClassName }: Props) {
  // Un turno viejo puede traer un texto libre que ya no está entre las
  // prepagas del médico: se muestra igual para no pisarlo al editar.
  const opciones = value && !prepagas.includes(value) ? [value, ...prepagas] : prepagas;
  return (
    <Select value={value || PARTICULAR} onValueChange={(v) => onChange(v === PARTICULAR ? "" : (v as string))}>
      <SelectTrigger className={cn("w-full", triggerClassName)}>
        <SelectValue>{(v: string) => (v === PARTICULAR ? "Particular" : v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={PARTICULAR}>Particular</SelectItem>
        {opciones.map((nombre) => (
          <SelectItem key={nombre} value={nombre}>
            {nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
