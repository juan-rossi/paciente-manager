"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Power, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SettingsSection } from "@/components/settings-section";
import { cn } from "@/lib/utils";

type Props = {
  initialMensajeTemplate: string;
  initialMensajeriaHabilitada: boolean;
};

export function MessagingSettings({ initialMensajeTemplate, initialMensajeriaHabilitada }: Props) {
  const router = useRouter();
  const [mensajeriaHabilitada, setMensajeriaHabilitada] = useState(initialMensajeriaHabilitada);
  const [mensajeTemplate, setMensajeTemplate] = useState(initialMensajeTemplate);
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
        body: JSON.stringify({ mensajeTemplate, mensajeriaHabilitada }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la configuración.");
        return;
      }
      setSaved(true);
      // El item "Recordatorios" del menú superior lo renderiza el layout
      // (server component) según `mensajeriaHabilitada` -- sin esto, el
      // toggle recién se reflejaría ahí después de navegar.
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Mensajería"
        description="Con la mensajería apagada, el item Recordatorios se oculta del menú superior."
        icon={Power}
      >
        <div className="flex items-center gap-3">
          <Switch
            id="mensajeria-habilitada"
            checked={mensajeriaHabilitada}
            onCheckedChange={setMensajeriaHabilitada}
          />
          <Label htmlFor="mensajeria-habilitada" className="font-normal">
            {mensajeriaHabilitada ? "Mensajería habilitada" : "Mensajería deshabilitada"}
          </Label>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Mensaje de recordatorio"
        description="Definí el mensaje que se precarga al enviar un WhatsApp de confirmación de turno."
        icon={MessageSquare}
      >
        <div className={cn("flex flex-col gap-3", !mensajeriaHabilitada && "opacity-60")}>
          <Label>Mensaje</Label>
          <Textarea
            rows={4}
            value={mensajeTemplate}
            onChange={(e) => setMensajeTemplate(e.target.value)}
            disabled={!mensajeriaHabilitada}
          />
          <div className="flex flex-col gap-1.5 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Variables disponibles:</span>
            <p>
              <code>{"{nombre}"}</code> — nombre y apellido del paciente.
            </p>
            <p>
              <code>{"{fecha}"}</code> — según cuándo sea el turno respecto al momento de enviar el
              recordatorio: <strong>&quot;hoy&quot;</strong> si es el mismo día,{" "}
              <strong>&quot;mañana&quot;</strong> si es al día siguiente, o{" "}
              <strong>&quot;el dd/mm/aaaa&quot;</strong> para cualquier otra fecha.
            </p>
            <p>
              <code>{"{hora}"}</code> — horario del turno (HH:MM).
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Envío automático de recordatorios"
        description="Mandá los recordatorios de turno por WhatsApp solo, sin que la secretaria tenga que apretar enviar."
        icon={Sparkles}
      >
        <div className="flex items-center gap-3 opacity-60">
          <Checkbox id="envio-automatico" checked={false} disabled />
          <Label htmlFor="envio-automatico" className="font-normal">
            Enviar automáticamente
          </Label>
          <Badge variant="secondary">Premium · Próximamente</Badge>
        </div>
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
