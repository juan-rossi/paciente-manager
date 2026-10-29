"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// Ficha del médico en /admin/medicos/[id]: lo saca de las métricas
// económicas (MRR, conversión, % de costo IA) sin tocarle el acceso.
export function BonificadoSwitch({ doctorId, bonificado }: { doctorId: string; bonificado: boolean }) {
  const router = useRouter();
  const [valor, setValor] = useState(bonificado);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cambiar(nuevo: boolean) {
    setError(null);
    setValor(nuevo);
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/medicos/${doctorId}/bonificado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bonificado: nuevo }),
      });
      const data = await response.json();
      if (!response.ok) {
        setValor(!nuevo);
        setError(data.error ?? "No se pudo guardar el cambio.");
        return;
      }
      setValor(data.bonificado);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="medico-bonificado">Médico bonificado (no paga)</Label>
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            No cuenta en el MRR, en la conversión trial→pago ni en el % de costo IA sobre su plan. No cambia su
            acceso: sigue dependiendo de su trial o plan vigente.
          </p>
        )}
      </div>
      <Switch
        id="medico-bonificado"
        className="mt-0.5"
        checked={valor}
        onCheckedChange={(checked) => void cambiar(checked)}
        disabled={saving}
      />
    </div>
  );
}
