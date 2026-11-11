"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Ficha del médico en /admin/medicos/[id]: prioridad manual en el directorio
// (ver `prioridadDirectorio` en el schema). El médico nunca la ve.
export function PrioridadDirectorioForm({
  doctorId,
  prioridadDirectorio,
}: {
  doctorId: string;
  prioridadDirectorio: number;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(String(prioridadDirectorio));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function guardar(nueva: string) {
    setError(null);
    setGuardado(false);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/medicos/${doctorId}/prioridad-directorio`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prioridadDirectorio: nueva || "0" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la prioridad.");
        return;
      }
      setValor(String(data.prioridadDirectorio));
      setGuardado(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void guardar(valor);
      }}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="prioridad-directorio">Prioridad en el directorio</Label>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          id="prioridad-directorio"
          inputMode="numeric"
          value={valor}
          onChange={(e) => {
            setValor(e.target.value.replace(/\D/g, "").slice(0, 3));
            setGuardado(false);
          }}
          placeholder="0"
          className="w-24 tabular-nums"
        />
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        {prioridadDirectorio > 0 && (
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => void guardar("0")}>
            Quitar prioridad
          </Button>
        )}
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : guardado ? (
        <p className="text-xs text-brand-accent">Prioridad guardada.</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Mayor número = más arriba. Es el primer criterio de orden entre los médicos que coinciden con los filtros
          de la búsqueda; después siguen destacados y orden alfabético (o distancia, si se busca por ciudad). 0 = sin
          prioridad. No lo hace aparecer en búsquedas que no coinciden.
        </p>
      )}
    </form>
  );
}
