"use client";

import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSection } from "@/components/settings-section";
import { irAConfiguracionTab } from "@/lib/configuracion-tabs";
import { cn } from "@/lib/utils";

type Props = {
  initialResumenAutomatico: boolean;
  initialResumenAutoAntecedentes: boolean;
  initialResumenAutoEvoluciones: boolean;
  // El dictado es una función Premium: sin plan Premium vigente la opción se
  // muestra bloqueada.
  transcripcionHabilitada: boolean;
};

export function DictadoSettings({
  initialResumenAutomatico,
  initialResumenAutoAntecedentes,
  initialResumenAutoEvoluciones,
  transcripcionHabilitada,
}: Props) {
  const [resumenAutomatico, setResumenAutomatico] = useState(initialResumenAutomatico);
  const [antecedentes, setAntecedentes] = useState(initialResumenAutoAntecedentes);
  const [evoluciones, setEvoluciones] = useState(initialResumenAutoEvoluciones);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const camposHabilitados = transcripcionHabilitada && resumenAutomatico;

  async function handleGuardar() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/dictado", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumenAutomatico,
          resumenAutoAntecedentes: antecedentes,
          resumenAutoEvoluciones: evoluciones,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "No se pudo guardar la configuración.");
        return;
      }
      setSaved(true);
    } catch {
      setError("No se pudo conectar para guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Resumen automático"
        description="Al terminar de dictar, la IA resume el texto sin que tengas que tocar «Resumir con IA». El dictado completo queda guardado debajo y podés volver a él en cualquier momento."
        icon={Sparkles}
      >
        {!transcripcionHabilitada && (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Lock className="size-3.5 shrink-0" />
              El dictado y el resumen con IA son parte del plan Premium.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start sm:self-auto"
              onClick={() => irAConfiguracionTab("plan")}
            >
              Ver Mi plan
            </Button>
          </div>
        )}

        <div className={cn("flex flex-col gap-4", !transcripcionHabilitada && "opacity-60")}>
          <div className="flex items-start gap-3">
            <Switch
              id="resumen-automatico"
              className="mt-0.5"
              checked={resumenAutomatico}
              onCheckedChange={setResumenAutomatico}
              disabled={!transcripcionHabilitada}
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="resumen-automatico" className="font-medium">
                Resumir automáticamente al terminar de dictar
              </Label>
              <p className="text-xs text-muted-foreground">
                Elegí en qué campos aplica. Si el resumen falla, queda la transcripción.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "flex flex-col gap-3 border-t border-border/60 pt-4 sm:pl-12",
              !camposHabilitados && "opacity-50"
            )}
          >
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="resumen-auto-antecedentes"
                className="mt-0.5"
                checked={antecedentes}
                onCheckedChange={(checked) => setAntecedentes(checked === true)}
                disabled={!camposHabilitados}
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="resumen-auto-antecedentes" className="font-normal">
                  Antecedentes de la enfermedad actual
                </Label>
                <p className="text-xs text-muted-foreground">En la consulta inicial del paciente.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="resumen-auto-evoluciones"
                className="mt-0.5"
                checked={evoluciones}
                onCheckedChange={(checked) => setEvoluciones(checked === true)}
                disabled={!camposHabilitados}
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="resumen-auto-evoluciones" className="font-normal">
                  Evoluciones
                </Label>
                <p className="text-xs text-muted-foreground">Al agregar o editar una evolución.</p>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleGuardar} disabled={saving || !transcripcionHabilitada}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        {saved && <p className="text-sm text-muted-foreground">Guardado.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
