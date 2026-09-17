"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatNombreConTitulo, type TituloCortesia } from "@/lib/titulo-cortesia";

export type DoctorOption = {
  id: string;
  nombre: string;
  apellido: string;
  tituloCortesia: TituloCortesia | null;
};

type Props = {
  doctores: DoctorOption[];
  activeDoctorId: string;
  className?: string;
};

// Solo se renderiza (ver `(app)/layout.tsx`) cuando una secretaria asiste a
// 2+ médicos -- si asiste a uno solo, no hay nada que elegir.
export function DoctorSwitcher({ doctores, activeDoctorId, className }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(activeDoctorId);
  const [isPending, startTransition] = useTransition();

  async function handleChange(doctorId: string | null) {
    if (!doctorId) return;
    const previous = value;
    setValue(doctorId);
    try {
      const res = await fetch("/api/account/active-doctor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId }),
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

  const labelPorId = new Map(
    doctores.map((d) => [d.id, formatNombreConTitulo(d.tituloCortesia, `${d.nombre} ${d.apellido}`.trim())])
  );

  return (
    <Select value={value} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className={cn("h-8 w-auto min-w-40 gap-1.5 bg-card text-sm", className)} size="sm">
        <Stethoscope className="size-3.5 text-muted-foreground" />
        <SelectValue>{(id: string) => labelPorId.get(id) ?? id}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {doctores.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {formatNombreConTitulo(d.tituloCortesia, `${d.nombre} ${d.apellido}`.trim())}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
