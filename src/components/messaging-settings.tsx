"use client";

import { useState } from "react";
import { CalendarClock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { SettingsSection } from "@/components/settings-section";

type Props = {
  initialMensajeTemplate: string;
  initialRecordatorioDiasAdelanto: number;
};

type DiasMode = "hoy" | "manana" | "otro";

function modeFromDias(dias: number): DiasMode {
  if (dias === 0) return "hoy";
  if (dias === 1) return "manana";
  return "otro";
}

export function MessagingSettings({
  initialMensajeTemplate,
  initialRecordatorioDiasAdelanto,
}: Props) {
  const [mensajeTemplate, setMensajeTemplate] = useState(initialMensajeTemplate);
  const [diasMode, setDiasMode] = useState<DiasMode>(() =>
    modeFromDias(initialRecordatorioDiasAdelanto)
  );
  const [otroDias, setOtroDias] = useState(() =>
    modeFromDias(initialRecordatorioDiasAdelanto) === "otro" ? initialRecordatorioDiasAdelanto : 2
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar() {
    const recordatorioDiasAdelanto =
      diasMode === "hoy" ? 0 : diasMode === "manana" ? 1 : otroDias;

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/messaging", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajeTemplate, recordatorioDiasAdelanto }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la configuración.");
        return;
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Mensaje de recordatorio"
        description="Definí el mensaje que se precarga al enviar un WhatsApp de confirmación de turno."
        icon={MessageSquare}
      >
        <Label>Mensaje</Label>
        <Textarea
          rows={4}
          value={mensajeTemplate}
          onChange={(e) => setMensajeTemplate(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Podés usar <code>{"{nombre}"}</code>, <code>{"{fecha}"}</code> y{" "}
          <code>{"{hora}"}</code>; se reemplazan por los datos de cada turno.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Turnos disponibles para recordatorio"
        description="Elegí qué turnos va a ver la secretaria en la pantalla de Recordatorios."
        icon={CalendarClock}
      >
        <RadioGroup
          className="flex flex-wrap items-center gap-[55px]"
          value={diasMode}
          onValueChange={(v) => setDiasMode(v as DiasMode)}
        >
          <div className="flex h-8 items-center gap-2">
            <RadioGroupItem value="hoy" id="dias-hoy" />
            <Label htmlFor="dias-hoy" className="font-normal">
              Día de hoy
            </Label>
          </div>
          <div className="flex h-8 items-center gap-2">
            <RadioGroupItem value="manana" id="dias-manana" />
            <Label htmlFor="dias-manana" className="font-normal">
              Mañana
            </Label>
          </div>
          <div className="flex h-8 items-center gap-2">
            <RadioGroupItem value="otro" id="dias-otro" />
            <Label htmlFor="dias-otro" className="font-normal">
              Otro
            </Label>
            {diasMode === "otro" && (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={90}
                  className="ml-2 max-w-24"
                  value={otroDias}
                  onChange={(e) => setOtroDias(Number(e.target.value))}
                />
                <span className="text-sm text-muted-foreground">días</span>
              </div>
            )}
          </div>
        </RadioGroup>
      </SettingsSection>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleGuardar} disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        {saved && <p className="text-sm text-muted-foreground">Guardado.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
