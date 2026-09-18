"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESPECIALIDAD_OPTIONS } from "@/lib/especialidad";

// Base-ui Select no distingue "sin elegir" de un value vacío, así que "todas
// las especialidades/ciudades" usa este sentinel en vez de "" -- se saca del
// query string al armar la URL.
const TODAS = "__todas__";

type Props = {
  ciudades: string[];
};

export function DirectorioFiltros({ ciudades }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [especialidad, setEspecialidad] = useState(searchParams.get("especialidad") ?? TODAS);
  const [ciudad, setCiudad] = useState(searchParams.get("ciudad") ?? TODAS);

  function buscar() {
    const params = new URLSearchParams();
    if (especialidad !== TODAS) params.set("especialidad", especialidad);
    if (ciudad !== TODAS) params.set("ciudad", ciudad);
    const qs = params.toString();
    router.push(`/directorio${qs ? `?${qs}` : ""}`);
  }

  const especialidadLabel =
    especialidad === TODAS
      ? "Todas las especialidades"
      : (ESPECIALIDAD_OPTIONS.find((o) => o.value === especialidad)?.label ?? "Especialidad");

  return (
    <div className="mx-auto mt-8 flex max-w-2xl flex-wrap gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-lg shadow-primary/10">
      <Select value={especialidad} onValueChange={(v) => setEspecialidad((v as string) ?? TODAS)}>
        <SelectTrigger className="h-11 flex-1 min-w-[170px]">
          <SelectValue>{() => especialidadLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>Todas las especialidades</SelectItem>
          {ESPECIALIDAD_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={ciudad} onValueChange={(v) => setCiudad((v as string) ?? TODAS)}>
        <SelectTrigger className="h-11 flex-1 min-w-[150px]">
          <SelectValue>{() => (ciudad === TODAS ? "Todas las ciudades" : ciudad)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODAS}>Todas las ciudades</SelectItem>
          {ciudades.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button size="lg" onClick={buscar} className="shrink-0">
        <Search className="size-4" data-icon="inline-start" />
        Buscar
      </Button>
    </div>
  );
}
