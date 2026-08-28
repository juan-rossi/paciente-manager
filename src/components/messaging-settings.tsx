"use client";

import { useState } from "react";
import { CalendarClock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingsSection } from "@/components/settings-section";

type Props = {
  initialMensajeTemplate: string;
  initialRecordatorioDiasAdelanto: number;
};

export function MessagingSettings({
  initialMensajeTemplate,
  initialRecordatorioDiasAdelanto,
}: Props) {
  const [mensajeTemplate, setMensajeTemplate] = useState(initialMensajeTemplate);
  const [diasAdelanto, setDiasAdelanto] = useState(initialRecordatorioDiasAdelanto);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuardar() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/messaging", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensajeTemplate,
          recordatorioDiasAdelanto: diasAdelanto,
        }),
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
        <Label>Días de anticipación</Label>
        <Input
          type="number"
          min={0}
          max={90}
          className="max-w-32"
          value={diasAdelanto}
          onChange={(e) => setDiasAdelanto(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          0 = turnos de hoy, 1 = turnos de mañana, etc.
        </p>
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
