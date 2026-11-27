"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CalendarClock,
  MessageSquare,
  MessagesSquare,
  Plus,
  Power,
  Repeat,
  Video,
  type LucideProps,
} from "lucide-react";
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
        &quot;Recordá abonar la consulta ($20.000) por transferencia al alias &quot;tu.alias&quot; antes del turno.&quot;
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

type MensajeId = "presencial" | "teleconsulta" | "paso" | "cancelacion" | "aplazamiento";

type Mensaje = {
  id: MensajeId;
  titulo: string;
  // Nombre corto para la lista de la izquierda.
  nombre: string;
  descripcion: string;
  icon: ComponentType<LucideProps>;
  texto: string;
  // Hay cambios respecto de lo último guardado (texto u opciones propias).
  sinGuardar: boolean;
  editor: ReactNode;
};

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
  const [seleccionado, setSeleccionado] = useState<MensajeId>("presencial");
  // Último estado guardado, para marcar qué mensajes tienen cambios pendientes.
  const [guardado, setGuardado] = useState({
    mensajeTemplate: initialMensajeTemplate,
    mensajeTemplateVirtual: initialMensajeTemplateVirtual,
    mensajeTemplatePasoTeleconsulta: initialMensajeTemplatePasoTeleconsulta,
    recordatorioAutoEnviado: initialRecordatorioAutoEnviado,
    mensajeTemplateCancelado: initialMensajeTemplateCancelado,
    mensajeTemplateAplazado: initialMensajeTemplateAplazado,
  });
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
      setGuardado({
        mensajeTemplate,
        mensajeTemplateVirtual,
        mensajeTemplatePasoTeleconsulta,
        recordatorioAutoEnviado,
        mensajeTemplateCancelado,
        mensajeTemplateAplazado,
      });
      // El item "Recordatorios" del menú superior lo renderiza el layout
      // (server component) según `mensajeriaHabilitada` -- sin esto, el
      // toggle recién se reflejaría ahí después de navegar.
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const deshabilitado = !mensajeriaHabilitada;

  const mensajes: Mensaje[] = [
    {
      id: "presencial",
      titulo: tieneTeleconsulta ? "Recordatorio de turno presencial" : "Recordatorio de turno",
      nombre: tieneTeleconsulta ? "Recordatorio presencial" : "Recordatorio de turno",
      descripcion: tieneTeleconsulta
        ? "Definí el mensaje que se precarga al enviar un WhatsApp de confirmación de un turno presencial."
        : "Definí el mensaje que se precarga al enviar un WhatsApp de confirmación de turno.",
      icon: MessageSquare,
      texto: mensajeTemplate,
      sinGuardar:
        mensajeTemplate !== guardado.mensajeTemplate ||
        recordatorioAutoEnviado !== guardado.recordatorioAutoEnviado,
      editor: (
        <>
          <TemplateEditor
            id="mensaje-recordatorio"
            label="Mensaje"
            value={mensajeTemplate}
            onChange={setMensajeTemplate}
            variables={tieneTeleconsulta ? VARIABLES_RECORDATORIO_CON_ALIAS : VARIABLES_RECORDATORIO}
            disabled={deshabilitado}
          >
            {!mensajeTemplate.includes("{confirmar}") && !mensajeTemplate.includes("{cancelar}") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                disabled={deshabilitado}
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
              disabled={deshabilitado}
            />
          </div>
        </>
      ),
    },
  ];

  if (tieneTeleconsulta) {
    mensajes.push({
      id: "teleconsulta",
      titulo: "Recordatorio de teleconsulta",
      nombre: "Recordatorio de teleconsulta",
      descripcion:
        "Se usa en lugar del recordatorio presencial para los turnos de un lugar de Teleconsulta, así el paciente recibe el link a la videollamada.",
      icon: Video,
      texto: mensajeTemplateVirtual,
      sinGuardar: mensajeTemplateVirtual !== guardado.mensajeTemplateVirtual,
      editor: (
        <TemplateEditor
          id="mensaje-recordatorio-virtual"
          label="Mensaje"
          value={mensajeTemplateVirtual}
          onChange={setMensajeTemplateVirtual}
          variables={VARIABLES_RECORDATORIO_VIRTUAL}
          disabled={deshabilitado}
        >
          <BotonesLinksSugeridos
            texto={mensajeTemplateVirtual}
            onChange={setMensajeTemplateVirtual}
            disabled={deshabilitado}
          />
        </TemplateEditor>
      ),
    });
  }

  if (puedePasarATeleconsulta) {
    mensajes.push({
      id: "paso",
      titulo: "Aviso de turno pasado a teleconsulta",
      nombre: "Pasó a teleconsulta",
      descripcion:
        "Se precarga al avisarle al paciente que su turno presencial pasó a ser por videollamada, desde la agenda o desde Pendientes de notificar.",
      icon: Repeat,
      texto: mensajeTemplatePasoTeleconsulta,
      sinGuardar: mensajeTemplatePasoTeleconsulta !== guardado.mensajeTemplatePasoTeleconsulta,
      editor: (
        <TemplateEditor
          id="mensaje-paso-teleconsulta"
          label="Mensaje"
          value={mensajeTemplatePasoTeleconsulta}
          onChange={setMensajeTemplatePasoTeleconsulta}
          variables={VARIABLES_RECORDATORIO_VIRTUAL}
          disabled={deshabilitado}
        >
          <BotonesLinksSugeridos
            texto={mensajeTemplatePasoTeleconsulta}
            onChange={setMensajeTemplatePasoTeleconsulta}
            disabled={deshabilitado}
          />
        </TemplateEditor>
      ),
    });
  }

  mensajes.push(
    {
      id: "cancelacion",
      titulo: "Mensaje de cancelación de turno",
      nombre: "Cancelación de turno",
      descripcion:
        "Se usa al notificar a un paciente cuyo turno se canceló al resolver un conflicto de \"Bloquear horarios\".",
      icon: Ban,
      texto: mensajeTemplateCancelado,
      sinGuardar: mensajeTemplateCancelado !== guardado.mensajeTemplateCancelado,
      editor: (
        <TemplateEditor
          id="mensaje-cancelacion"
          label="Mensaje"
          value={mensajeTemplateCancelado}
          onChange={setMensajeTemplateCancelado}
          variables={VARIABLES_CANCELACION}
          disabled={deshabilitado}
        />
      ),
    },
    {
      id: "aplazamiento",
      titulo: "Mensaje de aplazamiento de turno",
      nombre: "Aplazamiento de turno",
      descripcion:
        "Se usa al notificar a un paciente cuyo turno se reprogramó al resolver un conflicto de \"Bloquear horarios\".",
      icon: CalendarClock,
      texto: mensajeTemplateAplazado,
      sinGuardar: mensajeTemplateAplazado !== guardado.mensajeTemplateAplazado,
      editor: (
        <TemplateEditor
          id="mensaje-aplazamiento"
          label="Mensaje"
          value={mensajeTemplateAplazado}
          onChange={setMensajeTemplateAplazado}
          variables={VARIABLES_APLAZAMIENTO}
          disabled={deshabilitado}
        />
      ),
    }
  );

  const actual = mensajes.find((m) => m.id === seleccionado) ?? mensajes[0];
  const pendientes = mensajes.filter((m) => m.sinGuardar).length;
  const ActualIcon = actual.icon;

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

      <div className="overflow-hidden rounded-xl border border-border/60">
        <h3 className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground sm:px-5">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <MessagesSquare className="size-3.5" />
          </span>
          Mensajes
        </h3>

        <div className="grid bg-card md:grid-cols-[15rem_minmax(0,1fr)]">
          <div
            role="tablist"
            aria-label="Mensajes"
            aria-orientation="vertical"
            className="flex flex-col border-b border-border/60 md:border-r md:border-b-0"
          >
            {mensajes.map((m) => {
              const Icon = m.icon;
              const activo = m.id === actual.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  id={`tab-${m.id}`}
                  aria-selected={activo}
                  aria-controls="panel-mensaje"
                  onClick={() => setSeleccionado(m.id)}
                  className={cn(
                    "grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2.5 border-b border-border/60 px-4 py-3 text-left transition-colors last:border-b-0",
                    "focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50",
                    activo ? "bg-primary/5 shadow-[inset_3px_0_0_var(--color-primary)]" : "hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md",
                      activo ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={cn("text-sm", activo ? "font-semibold text-primary" : "font-medium")}>
                      {m.nombre}
                    </span>
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {m.texto.trim() || "Sin mensaje"}
                    </span>
                  </span>
                  {m.sinGuardar && (
                    <span
                      className="mt-1.5 size-2 rounded-full bg-amber-500"
                      title="Cambios sin guardar"
                      aria-label="Cambios sin guardar"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id="panel-mensaje"
            aria-labelledby={`tab-${actual.id}`}
            className="flex min-w-0 flex-col gap-3 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ActualIcon className="size-3.5" />
              </span>
              {actual.titulo}
            </div>
            <p className="border-b border-dashed border-border pb-3 text-xs text-muted-foreground">
              {actual.descripcion}
            </p>
            <div key={actual.id} className={cn("flex flex-col gap-3", deshabilitado && "opacity-60")}>
              {actual.editor}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleGuardar} disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        {pendientes > 0 ? (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden />
            {pendientes === 1 ? "1 mensaje sin guardar" : `${pendientes} mensajes sin guardar`}
          </p>
        ) : (
          saved && <p className="text-sm text-muted-foreground">Guardado.</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// Atajos para sumar los links que faltan en los mensajes de teleconsulta.
function BotonesLinksSugeridos({
  texto,
  onChange,
  disabled,
}: {
  texto: string;
  onChange: (fn: (t: string) => string) => void;
  disabled: boolean;
}) {
  const faltaVideollamada = !texto.includes("{videollamada}");
  const faltanConfirmarCancelar = !texto.includes("{confirmar}") && !texto.includes("{cancelar}");
  if (!faltaVideollamada && !faltanConfirmarCancelar) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {faltaVideollamada && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange((t) => `${t.trimEnd()}\n${LINK_VIDEOLLAMADA_SUGERIDO}`)}
        >
          <Plus className="size-3.5" />
          Agregar link a la videollamada
        </Button>
      )}
      {faltanConfirmarCancelar && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange((t) => `${t.trimEnd()}\n${LINKS_SUGERIDOS}`)}
        >
          <Plus className="size-3.5" />
          Agregar links de confirmar y cancelar
        </Button>
      )}
    </div>
  );
}
