"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type LugarOption = {
  id: string;
  tipo: "PARTICULAR" | "CONSULTORIO";
  nombre: string | null;
};

function lugarLabel(lugar: LugarOption): string {
  return lugar.nombre ?? "Consulta particular";
}

type Props = {
  lugares: LugarOption[];
  activeLugarId: string;
  className?: string;
};

// Solo se renderiza (ver `(app)/layout.tsx`) cuando una secretaria tiene 2+
// lugares asignados para el médico activo -- si tiene uno solo, no hay nada
// que elegir.
export function LugarSwitcher({ lugares, activeLugarId, className }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(activeLugarId);
  const [isPending, startTransition] = useTransition();

  async function handleChange(lugarId: string | null) {
    if (!lugarId) return;
    const previous = value;
    setValue(lugarId);
    try {
      const res = await fetch("/api/account/active-lugar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lugarId }),
      });
      if (!res.ok) {
        setValue(previous);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setValue(previous);
    }
  }

  const labelPorId = new Map(lugares.map((l) => [l.id, lugarLabel(l)]));

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className={cn("h-8 w-auto min-w-40 gap-1.5 bg-card text-sm", className)} size="sm">
        <MapPin className="size-3.5 text-muted-foreground" />
        <SelectValue>{(id: string) => labelPorId.get(id) ?? id}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {lugares.map((l) => (
          <SelectItem key={l.id} value={l.id}>
            {lugarLabel(l)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
