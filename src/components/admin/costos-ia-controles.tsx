"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-white px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function SelectorMes({
  mes,
  meses,
}: {
  mes: string;
  meses: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <select
      id="costos-ia-mes"
      aria-label="Mes"
      value={mes}
      onChange={(e) => router.push(`${pathname}?mes=${e.target.value}`)}
      className={SELECT_CLASS}
    >
      {meses.map((m) => (
        <option key={m.value} value={m.value}>
          {m.label}
        </option>
      ))}
    </select>
  );
}

export function CotizacionForm({
  mes,
  mesLabel,
  arsPorUsd,
  heredadaDe,
}: {
  mes: string;
  mesLabel: string;
  arsPorUsd: number | null;
  // Label del mes del que sale el valor cuando el mes no tiene una propia.
  heredadaDe: string | null;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(arsPorUsd ? String(arsPorUsd) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardado(false);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/cotizacion-dolar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes, arsPorUsd: valor }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la cotización.");
        return;
      }
      setGuardado(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Label htmlFor="cotizacion-ars-por-usd">Cotización del dólar · {mesLabel}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="cotizacion-ars-por-usd"
            inputMode="numeric"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value.replace(/\D/g, ""));
              setGuardado(false);
            }}
            placeholder="1450"
            className="w-32 pl-6"
          />
        </div>
        <span className="text-sm text-muted-foreground">ARS por USD</span>
        <Button type="submit" size="sm" disabled={saving || !valor}>
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : guardado ? (
        <p className="text-xs text-brand-accent">Cotización guardada.</p>
      ) : heredadaDe ? (
        <p className="text-xs text-muted-foreground">
          Este mes no tiene cotización propia: se usa la de {heredadaDe}.
        </p>
      ) : !arsPorUsd ? (
        <p className="text-xs text-muted-foreground">Cargala para ver los costos en pesos.</p>
      ) : null}
    </form>
  );
}
