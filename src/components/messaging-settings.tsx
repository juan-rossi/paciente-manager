"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CalendarClock, MessageSquare, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSection } from "@/components/settings-section";
import { TemplateEditor, type TemplateVariable } from "@/components/template-editor";
import { cn } from "@/lib/utils";

const LINKS_SUGERIDOS = "Confirmá tu asistencia: {confirmar}\nSi no podés venir, cancelá acá: {cancelar}";

const NOMBRE: TemplateVariable = { token: "{nombre}", description: "nombre y apellido del paciente." };

const VARIABLES_RECORDATORIO: TemplateVariable[] = [
  NOMBRE,
  {
    token: "{fecha}",
    description: (
      <>
        según cuándo sea el turno respecto al momento de enviar el recordatorio:{" "}
        <strong>&quot;hoy&quot;</strong>, <strong>&quot;mañana&quot;</strong> o{" "}
        <strong>&quot;el dd/mm/aaaa&quot;</strong>.
      </>
    ),
  },
  { token: "{hora}", description: "horario del turno (HH:MM)." },
  {
    token: "{confirmar}",
    link: true,
    description: (
      <>
        link para que el paciente confirme su asistencia. El turno pasa a{" "}
        <strong>Confirmado</strong> en la agenda.
      </>
    ),
  },
  {
    token: "{cancelar}",
    link: true,
    description: (
      <>
        link para que el paciente cancele el turno (hasta 1 hora antes). El horario queda libre y
        aparece en <strong>Cancelados por pacientes</strong>.
      </>
    ),
  },
];

const VARIABLES_CANCELACION: TemplateVariable[] = [
  NOMBRE,
  { token: "{fecha}", description: "día del turno que se canceló." },
  { token: "{hora}", description: "horario del turno que se canceló." },
];

const VARIABLES_APLAZAMIENTO: TemplateVariable[] = [
  NOMBRE,
  { token: "{fecha}", description: <>día del turno <strong>original</strong>, antes de moverse.</> },
  { token: "{hora}", description: <>horario del turno <strong>original</strong>, antes de moverse.</> },
  { token: "{nueva_fecha}", description: "día al que se movió el turno." },
  { token: "{nueva_hora}", description: "horario al que se movió el turno." },
];

type Props = {
  initialMensajeTemplate: string;
  initialMensajeriaHabilitada: boolean;
  initialMensajeTemplateCancelado: string;
  initialMensajeTemplateAplazado: string;
};

export function MessagingSettings({
  initialMensajeTemplate,
  initialMensajeriaHabilitada,
  initialMensajeTemplateCancelado,
  initialMensajeTemplateAplazado,
}: Props) {
  const router = useRouter();
  const [mensajeriaHabilitada, setMensajeriaHabilitada] = useState(initialMensajeriaHabilitada);
  const [mensajeTemplate, setMensajeTemplate] = useState(initialMensajeTemplate);
  const [mensajeTemplateCancelado, setMensajeTemplateCancelado] = useState(
    initialMensajeTemplateCancelado
  );
  const [mensajeTemplateAplazado, setMensajeTemplateAplazado] = useState(
    initialMensajeTemplateAplazado
  );
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
          mensajeriaHabilitada,
          mensajeTemplateCancelado,
          mensajeTemplateAplazado,
        }),
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
          <TemplateEditor
            id="mensaje-recordatorio"
            label="Mensaje"
            value={mensajeTemplate}
            onChange={setMensajeTemplate}
            variables={VARIABLES_RECORDATORIO}
            disabled={!mensajeriaHabilitada}
          >
            {!mensajeTemplate.includes("{confirmar}") && !mensajeTemplate.includes("{cancelar}") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                disabled={!mensajeriaHabilitada}
                onClick={() => setMensajeTemplate((t) => `${t.trimEnd()}\n${LINKS_SUGERIDOS}`)}
              >
                <Plus className="size-3.5" />
                Agregar links de confirmar y cancelar
              </Button>
            )}
          </TemplateEditor>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Mensaje de cancelación"
        description="Se usa al notificar a un paciente cuyo turno se canceló al resolver un conflicto de &quot;Bloquear horarios&quot;."
        icon={Ban}
      >
        <div className={cn("flex flex-col gap-3", !mensajeriaHabilitada && "opacity-60")}>
          <TemplateEditor
            id="mensaje-cancelacion"
            label="Mensaje"
            value={mensajeTemplateCancelado}
            onChange={setMensajeTemplateCancelado}
            variables={VARIABLES_CANCELACION}
            disabled={!mensajeriaHabilitada}
          />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Mensaje de aplazamiento"
        description="Se usa al notificar a un paciente cuyo turno se reprogramó al resolver un conflicto de &quot;Bloquear horarios&quot;."
        icon={CalendarClock}
      >
        <div className={cn("flex flex-col gap-3", !mensajeriaHabilitada && "opacity-60")}>
          <TemplateEditor
            id="mensaje-aplazamiento"
            label="Mensaje"
            value={mensajeTemplateAplazado}
            onChange={setMensajeTemplateAplazado}
            variables={VARIABLES_APLAZAMIENTO}
            disabled={!mensajeriaHabilitada}
          />
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
