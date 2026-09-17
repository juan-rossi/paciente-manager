"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, MessageSquare, Power, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SettingsSection } from "@/components/settings-section";
import { cn } from "@/lib/utils";

type Props = {
  initialMensajeTemplate: string;
  initialRecordatorioDiasAdelanto: number;
  initialMensajeriaHabilitada: boolean;
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
  initialMensajeriaHabilitada,
}: Props) {
  const router = useRouter();
  const [mensajeriaHabilitada, setMensajeriaHabilitada] = useState(initialMensajeriaHabilitada);
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
        body: JSON.stringify({ mensajeTemplate, recordatorioDiasAdelanto, mensajeriaHabilitada }),
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
          <p className="text-xs text-muted-foreground">
            Podés usar <code>{"{nombre}"}</code>, <code>{"{fecha}"}</code> y{" "}
            <code>{"{hora}"}</code>; se reemplazan por los datos de cada turno.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Turnos disponibles para recordatorio"
        description="Elegí qué turnos va a ver la secretaria en la pantalla de Recordatorios."
        icon={CalendarClock}
      >
        <RadioGroup
          className={cn("flex flex-wrap items-center gap-[55px]", !mensajeriaHabilitada && "opacity-60")}
          value={diasMode}
          onValueChange={(v) => setDiasMode(v as DiasMode)}
          disabled={!mensajeriaHabilitada}
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
                  disabled={!mensajeriaHabilitada}
                />
                <span className="text-sm text-muted-foreground">días</span>
              </div>
            )}
          </div>
        </RadioGroup>
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
