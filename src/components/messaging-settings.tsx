"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CalendarClock, MessageSquare, Plus, Power, Repeat, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSection } from "@/components/settings-section";
import { TemplateEditor, type TemplateVariable } from "@/components/template-editor";
import { cn } from "@/lib/utils";

const LINKS_SUGERIDOS = "Confirmá tu asistencia: {confirmar}\nSi no podés venir, cancelá acá: {cancelar}";

const LINK_VIDEOLLAMADA_SUGERIDO = "A la hora del turno, entrá a la videollamada desde acá: {videollamada}";

const NOMBRE: TemplateVariable = { token: "{nombre}", description: "nombre y apellido del paciente." };

const FECHA: TemplateVariable = {
  token: "{fecha}",
  description: (
    <>
      según cuándo sea el turno respecto al momento de enviar el recordatorio:{" "}
      <strong>&quot;hoy&quot;</strong>, <strong>&quot;mañana&quot;</strong> o{" "}
      <strong>&quot;el dd/mm/aaaa&quot;</strong>.
    </>
  ),
};

const HORA: TemplateVariable = { token: "{hora}", description: "horario del turno (HH:MM)." };

const CONFIRMAR: TemplateVariable = {
  token: "{confirmar}",
  link: true,
  description: (
    <>
      link para que el paciente confirme su asistencia. El turno pasa a{" "}
      <strong>Confirmado</strong> en la agenda.
    </>
  ),
};

const CANCELAR: TemplateVariable = {
  token: "{cancelar}",
  link: true,
  description: (
    <>
      link para que el paciente cancele el turno (hasta 1 hora antes). El horario queda libre y
      aparece en <strong>Cancelados por pacientes</strong>.
    </>
  ),
};

// Se configuran en Configuración > Teleconsulta > Cobro (ver teleconsulta-cobro.ts).
const ALIAS: TemplateVariable = {
  token: "{alias}",
  description: (
    <>
      tu alias o CBU/CVU para transferencias, tal como lo cargaste en{" "}
      <strong>Teleconsulta</strong>. Si no cargaste ninguno, queda en blanco.
    </>
  ),
};

const PAGO: TemplateVariable = {
  token: "{pago}",
  description: (
    <>
      cuándo, cuánto y cómo se paga, según lo que elegiste en <strong>Teleconsulta</strong>. Ej.:{" "}
      <strong>
        &quot;Recordá abonar la consulta ($ 20.000) por transferencia a tu.alias antes del turno.&quot;
      </strong>
    </>
  ),
};

const VARIABLES_RECORDATORIO: TemplateVariable[] = [NOMBRE, FECHA, HORA, CONFIRMAR, CANCELAR];

// Con teleconsulta, el alias de cobro también sirve en el recordatorio presencial.
const VARIABLES_RECORDATORIO_CON_ALIAS: TemplateVariable[] = [...VARIABLES_RECORDATORIO, ALIAS];

const VARIABLES_RECORDATORIO_VIRTUAL: TemplateVariable[] = [
  NOMBRE,
  FECHA,
  HORA,
  CONFIRMAR,
  CANCELAR,
  {
    token: "{videollamada}",
    link: true,
    description: (
      <>
        link a la sala de la videollamada. Si no lo usás, se agrega igual al final del mensaje.
      </>
    ),
  },
  PAGO,
  ALIAS,
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
  initialMensajeTemplateVirtual: string;
  // Flag TELECONSULTA_HABILITADA + Configuración > Teleconsulta del médico
  // -- apagado, la plantilla de teleconsulta se oculta. Prendido se muestra
  // siempre, aunque el médico no tenga un lugar de Teleconsulta: puede pasar
  // turnos presenciales a teleconsulta (ver `Turno.teleconsulta`).
  tieneTeleconsulta: boolean;
  // Configuración > Teleconsulta > "Pasar turnos presenciales a
  // teleconsulta": sin eso no hay aviso de paso que configurar.
  puedePasarATeleconsulta: boolean;
  initialMensajeTemplatePasoTeleconsulta: string;
  initialMensajeriaHabilitada: boolean;
  initialRecordatorioAutoEnviado: boolean;
  initialMensajeTemplateCancelado: string;
  initialMensajeTemplateAplazado: string;
};

export function MessagingSettings({
  initialMensajeTemplate,
  initialMensajeTemplateVirtual,
  tieneTeleconsulta,
  puedePasarATeleconsulta,
  initialMensajeTemplatePasoTeleconsulta,
  initialMensajeriaHabilitada,
  initialRecordatorioAutoEnviado,
  initialMensajeTemplateCancelado,
  initialMensajeTemplateAplazado,
}: Props) {
  const router = useRouter();
  const [mensajeriaHabilitada, setMensajeriaHabilitada] = useState(initialMensajeriaHabilitada);
  const [mensajeTemplate, setMensajeTemplate] = useState(initialMensajeTemplate);
  const [mensajeTemplateVirtual, setMensajeTemplateVirtual] = useState(initialMensajeTemplateVirtual);
  const [mensajeTemplatePasoTeleconsulta, setMensajeTemplatePasoTeleconsulta] = useState(
    initialMensajeTemplatePasoTeleconsulta
  );
  const [recordatorioAutoEnviado, setRecordatorioAutoEnviado] = useState(
    initialRecordatorioAutoEnviado
  );
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
          mensajeTemplateVirtual,
          mensajeTemplatePasoTeleconsulta,
          mensajeriaHabilitada,
          recordatorioAutoEnviado,
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
        title="Recordatorio de turno presencial"
        description={
          tieneTeleconsulta
            ? "Definí el mensaje que se precarga al enviar un WhatsApp de confirmación de un turno presencial."
            : "Definí el mensaje que se precarga al enviar un WhatsApp de confirmación de turno."
        }
        icon={MessageSquare}
      >
        <div className={cn("flex flex-col gap-3", !mensajeriaHabilitada && "opacity-60")}>
          <TemplateEditor
            id="mensaje-recordatorio"
            label="Mensaje"
            value={mensajeTemplate}
            onChange={setMensajeTemplate}
            variables={tieneTeleconsulta ? VARIABLES_RECORDATORIO_CON_ALIAS : VARIABLES_RECORDATORIO}
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

          <div className="flex items-start justify-between gap-4 border-t border-dashed border-border pt-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="recordatorio-auto-enviado">Marcar como enviado al abrir WhatsApp</Label>
              <p className="text-xs text-muted-foreground">
                En Recordatorios, tocar &quot;Enviar y marcar&quot; abre el chat y deja el turno como{" "}
                <strong>Enviado</strong>, sin un segundo click. Si te equivocás, tocá la insignia para
                desmarcarlo.
              </p>
            </div>
            <Switch
              id="recordatorio-auto-enviado"
              className="mt-0.5 shrink-0"
              checked={recordatorioAutoEnviado}
              onCheckedChange={setRecordatorioAutoEnviado}
              disabled={!mensajeriaHabilitada}
            />
          </div>
        </div>
      </SettingsSection>

      {tieneTeleconsulta && (
        <SettingsSection
          title="Recordatorio de teleconsulta"
          description="Se usa en lugar del anterior para los turnos de un lugar de Teleconsulta, así el paciente recibe el link a la videollamada."
          icon={Video}
        >
          <div className={cn("flex flex-col gap-3", !mensajeriaHabilitada && "opacity-60")}>
            <TemplateEditor
              id="mensaje-recordatorio-virtual"
              label="Mensaje"
              value={mensajeTemplateVirtual}
              onChange={setMensajeTemplateVirtual}
              variables={VARIABLES_RECORDATORIO_VIRTUAL}
              disabled={!mensajeriaHabilitada}
            >
              {(!mensajeTemplateVirtual.includes("{videollamada}") ||
                (!mensajeTemplateVirtual.includes("{confirmar}") &&
                  !mensajeTemplateVirtual.includes("{cancelar}"))) && (
                <div className="flex flex-wrap gap-2">
                  {!mensajeTemplateVirtual.includes("{videollamada}") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!mensajeriaHabilitada}
                      onClick={() =>
                        setMensajeTemplateVirtual((t) => `${t.trimEnd()}\n${LINK_VIDEOLLAMADA_SUGERIDO}`)
                      }
                    >
                      <Plus className="size-3.5" />
                      Agregar link a la videollamada
                    </Button>
                  )}
                  {!mensajeTemplateVirtual.includes("{confirmar}") &&
                    !mensajeTemplateVirtual.includes("{cancelar}") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!mensajeriaHabilitada}
                        onClick={() => setMensajeTemplateVirtual((t) => `${t.trimEnd()}\n${LINKS_SUGERIDOS}`)}
                      >
                        <Plus className="size-3.5" />
                        Agregar links de confirmar y cancelar
                      </Button>
                    )}
                </div>
              )}
            </TemplateEditor>
          </div>
        </SettingsSection>
      )}

      {puedePasarATeleconsulta && (
        <SettingsSection
          title="Aviso de turno pasado a teleconsulta"
          description="Se precarga al avisarle al paciente que su turno presencial pasó a ser por videollamada, desde la agenda o desde Pendientes de notificar."
          icon={Repeat}
        >
          <div className={cn("flex flex-col gap-3", !mensajeriaHabilitada && "opacity-60")}>
            <TemplateEditor
              id="mensaje-paso-teleconsulta"
              label="Mensaje"
              value={mensajeTemplatePasoTeleconsulta}
              onChange={setMensajeTemplatePasoTeleconsulta}
              variables={VARIABLES_RECORDATORIO_VIRTUAL}
              disabled={!mensajeriaHabilitada}
            >
              {(!mensajeTemplatePasoTeleconsulta.includes("{videollamada}") ||
                (!mensajeTemplatePasoTeleconsulta.includes("{confirmar}") &&
                  !mensajeTemplatePasoTeleconsulta.includes("{cancelar}"))) && (
                <div className="flex flex-wrap gap-2">
                  {!mensajeTemplatePasoTeleconsulta.includes("{videollamada}") && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!mensajeriaHabilitada}
                      onClick={() =>
                        setMensajeTemplatePasoTeleconsulta((t) => `${t.trimEnd()}\n${LINK_VIDEOLLAMADA_SUGERIDO}`)
                      }
                    >
                      <Plus className="size-3.5" />
                      Agregar link a la videollamada
                    </Button>
                  )}
                  {!mensajeTemplatePasoTeleconsulta.includes("{confirmar}") &&
                    !mensajeTemplatePasoTeleconsulta.includes("{cancelar}") && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!mensajeriaHabilitada}
                        onClick={() =>
                          setMensajeTemplatePasoTeleconsulta((t) => `${t.trimEnd()}\n${LINKS_SUGERIDOS}`)
                        }
                      >
                        <Plus className="size-3.5" />
                        Agregar links de confirmar y cancelar
                      </Button>
                    )}
                </div>
              )}
            </TemplateEditor>
          </div>
        </SettingsSection>
      )}

      <SettingsSection
        title="Mensaje de cancelación de turno"
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
        title="Mensaje de aplazamiento de turno"
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
