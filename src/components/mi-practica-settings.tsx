"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  House,
  Link2,
  MonitorSmartphone,
  ShieldCheck,
  CalendarDays,
  Clock,
  MapPin,
  Video,
  Pencil,
  Phone,
  Plus,
  Repeat,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsSection } from "@/components/settings-section";
import { AddressAutocomplete, type AddressResult } from "@/components/address-autocomplete";
import { formatHoraBA, TIME_ZONE } from "@/lib/timezone";
import { DIA_SEMANA_VALUES, type DiaSemana } from "@/lib/slots";
import { cn, filterTelefono } from "@/lib/utils";
import {
  LUGAR_TIPO_LABEL,
  type LugarTrabajoTipo,
  mensajeLugarDuplicado,
  nombreLugar,
} from "@/lib/lugar-tipo";

const DIA_LABELS: Record<DiaSemana, string> = {
  LUNES: "Lunes",
  MARTES: "Martes",
  MIERCOLES: "Miércoles",
  JUEVES: "Jueves",
  VIERNES: "Viernes",
  SABADO: "Sábado",
  DOMINGO: "Domingo",
};

type LugarDeTrabajo = {
  id: string;
  tipo: LugarTrabajoTipo;
  nombre: string | null;
  direccion: string;
  telefono: string;
  latitud: number | null;
  longitud: number | null;
  ciudad: string | null;
  permiteTeleconsulta: boolean;
};

type Block = {
  id: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  lugarId: string | null;
};

type ReprogramacionPreview = {
  turnoId: string;
  nombreYApellido: string;
  oldInicio: string;
  newInicio: string;
};

type Props = {
  // Flag de plataforma + Configuración > Teleconsulta del médico (ver
  // `teleconsultaEfectiva`): sin esto no se ofrece crear lugares de
  // Teleconsulta.
  puedeCrearLugarVirtual: boolean;
  // "Pasar turnos presenciales a teleconsulta" prendido en Configuración >
  // Teleconsulta: sin esto no se ofrece habilitarlo por lugar.
  puedePasarATeleconsulta: boolean;
  initialLugares: LugarDeTrabajo[];
  initialBlocks: Block[];
  initialSlotDurationMinutes: number;
  initialSobreturnosHabilitados: boolean;
};

function lugarLabel(lugar: { tipo: LugarTrabajoTipo; nombre: string | null }): string {
  return nombreLugar(lugar);
}

function formatFechaHora(iso: string) {
  const date = new Date(iso);
  const fecha = date.toLocaleDateString("es-AR", { timeZone: TIME_ZONE });
  return `${fecha} ${formatHoraBA(date)}`;
}

export function MiPracticaSettings({
  puedeCrearLugarVirtual,
  puedePasarATeleconsulta,
  initialLugares,
  initialBlocks,
  initialSlotDurationMinutes,
  initialSobreturnosHabilitados,
}: Props) {
  const router = useRouter();
  const [lugares, setLugares] = useState<LugarDeTrabajo[]>(initialLugares);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [activeLugarId, setActiveLugarId] = useState<string | null>(initialLugares[0]?.id ?? null);

  // --- Duración de turnos / sobreturnos (config global de la agenda, no
  // por lugar) -- migrado tal cual de la vieja pantalla "Horario de trabajo".
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialSlotDurationMinutes);
  const [savedDurationMinutes, setSavedDurationMinutes] = useState(initialSlotDurationMinutes);
  const [sobreturnosHabilitados, setSobreturnosHabilitados] = useState(
    initialSobreturnosHabilitados
  );
  const [savingSobreturnos, setSavingSobreturnos] = useState(false);
  const [sobreturnosError, setSobreturnosError] = useState<string | null>(null);
  const [savingDuration, setSavingDuration] = useState(false);
  const [durationError, setDurationError] = useState<string | null>(null);

  const [reschedulePreview, setReschedulePreview] = useState<ReprogramacionPreview[] | null>(null);
  const [pendingDuration, setPendingDuration] = useState<number | null>(null);
  const [applyingReschedule, setApplyingReschedule] = useState(false);
  const [rescheduledCount, setRescheduledCount] = useState<number | null>(null);

  // --- Alta/edición de lugar
  const [lugarOpen, setLugarOpen] = useState(false);
  const [editingLugar, setEditingLugar] = useState<LugarDeTrabajo | null>(null);
  const [tipo, setTipo] = useState<LugarTrabajoTipo>("CONSULTORIO");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [telefono, setTelefono] = useState("");
  const [permiteTeleconsulta, setPermiteTeleconsulta] = useState(false);
  const [savingLugar, setSavingLugar] = useState(false);
  const [lugarError, setLugarError] = useState<string | null>(null);
  const [triedSubmitLugar, setTriedSubmitLugar] = useState(false);

  const [deleteLugarTarget, setDeleteLugarTarget] = useState<LugarDeTrabajo | null>(null);
  const [deletingLugar, setDeletingLugar] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // --- Alta/edición de horario (siempre para `activeLugarId`)
  const [blockOpen, setBlockOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [diaSemana, setDiaSemana] = useState<DiaSemana>("LUNES");
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("17:00");
  const [savingBlock, setSavingBlock] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [deleteBlockTarget, setDeleteBlockTarget] = useState<Block | null>(null);
  const [deletingBlock, setDeletingBlock] = useState(false);
  const [deleteBlockError, setDeleteBlockError] = useState<string | null>(null);

  const lugarActivo = lugares.find((l) => l.id === activeLugarId) ?? null;
  const blocksDelLugarActivo = blocks.filter((b) => b.lugarId === activeLugarId);

  async function handleGuardarDuracion() {
    setSavingDuration(true);
    setDurationError(null);
    setRescheduledCount(null);
    try {
      const response = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotDurationMinutes }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && data.preview) {
          setPendingDuration(slotDurationMinutes);
          setReschedulePreview(data.preview);
          return;
        }
        setDurationError(data.error ?? "No se pudo guardar la duración.");
        return;
      }
      setSavedDurationMinutes(data.slotDurationMinutes);
      router.refresh();
    } finally {
      setSavingDuration(false);
    }
  }

  async function handleConfirmarReprogramacion() {
    if (pendingDuration === null) return;
    setApplyingReschedule(true);
    setDurationError(null);
    try {
      const response = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotDurationMinutes: pendingDuration, applyReschedule: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDurationError(data.error ?? "No se pudo reprogramar los turnos.");
        return;
      }
      setSavedDurationMinutes(data.slotDurationMinutes);
      setRescheduledCount((data.rescheduled ?? []).length);
      setReschedulePreview(null);
      setPendingDuration(null);
      router.refresh();
    } finally {
      setApplyingReschedule(false);
    }
  }

  async function handleToggleSobreturnos(checked: boolean) {
    const previous = sobreturnosHabilitados;
    setSobreturnosHabilitados(checked);
    setSavingSobreturnos(true);
    setSobreturnosError(null);
    try {
      const response = await fetch("/api/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotDurationMinutes: savedDurationMinutes,
          sobreturnosHabilitados: checked,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSobreturnosHabilitados(previous);
        setSobreturnosError(data.error ?? "No se pudo guardar el cambio.");
        return;
      }
      setSobreturnosHabilitados(data.sobreturnosHabilitados);
      router.refresh();
    } catch {
      setSobreturnosHabilitados(previous);
      setSobreturnosError("No se pudo conectar con el servidor.");
    } finally {
      setSavingSobreturnos(false);
    }
  }

  const hayParticular = lugares.some((l) => l.tipo === "PARTICULAR");
  const hayVirtual = lugares.some((l) => l.tipo === "VIRTUAL");

  function openCreateLugar() {
    setEditingLugar(null);
    setTipo(hayParticular ? "CONSULTORIO" : "PARTICULAR");
    setNombre("");
    setDireccion("");
    setLatitud(null);
    setLongitud(null);
    setCiudad(null);
    setTelefono("");
    setPermiteTeleconsulta(false);
    setLugarError(null);
    setTriedSubmitLugar(false);
    setLugarOpen(true);
  }

  function openEditLugar(lugar: LugarDeTrabajo) {
    setEditingLugar(lugar);
    setTipo(lugar.tipo);
    setNombre(lugar.nombre ?? "");
    setDireccion(lugar.direccion);
    setLatitud(lugar.latitud);
    setLongitud(lugar.longitud);
    setCiudad(lugar.ciudad);
    setTelefono(lugar.telefono);
    setPermiteTeleconsulta(lugar.permiteTeleconsulta);
    setLugarError(null);
    setTriedSubmitLugar(false);
    setLugarOpen(true);
  }

  function handleDireccionTextChange(text: string) {
    setDireccion(text);
    setLatitud(null);
    setLongitud(null);
    setCiudad(null);
  }

  function handleDireccionSelect(result: AddressResult) {
    setDireccion(result.direccion);
    setLatitud(result.latitud);
    setLongitud(result.longitud);
    setCiudad(result.ciudad);
  }

  // El radio "Particular" solo se puede elegir si no hay otro particular
  // cargado, o si el que se está editando es justamente ese.
  const particularDeshabilitado = hayParticular && editingLugar?.tipo !== "PARTICULAR";
  // Lo mismo con la teleconsulta: una sola por médico.
  const virtualDeshabilitado = hayVirtual && editingLugar?.tipo !== "VIRTUAL";

  // Pasar turnos de este lugar a teleconsulta: solo en lugares presenciales
  // y si el médico lo tiene prendido en Configuración > Teleconsulta. Si lo
  // apagó después, un lugar que ya lo tenía lo sigue mostrando para poder
  // desactivarlo.
  const mostrarPermiteTeleconsulta =
    tipo !== "VIRTUAL" && (puedePasarATeleconsulta || !!editingLugar?.permiteTeleconsulta);

  async function handleGuardarLugar() {
    if (
      (tipo !== "VIRTUAL" && (!direccion.trim() || !telefono.trim())) ||
      (tipo === "CONSULTORIO" && !nombre.trim())
    ) {
      setTriedSubmitLugar(true);
      setLugarError("Completá los campos obligatorios.");
      return;
    }
    setLugarError(null);
    setSavingLugar(true);
    try {
      const response = await fetch(
        editingLugar ? `/api/lugares-trabajo/${editingLugar.id}` : "/api/lugares-trabajo",
        {
          method: editingLugar ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo,
            nombre: tipo === "CONSULTORIO" ? nombre : undefined,
            direccion: tipo === "VIRTUAL" ? undefined : direccion,
            telefono: tipo === "VIRTUAL" ? undefined : telefono,
            latitud,
            longitud,
            ciudad,
            // Solo se manda si la opción está a la vista (ver
            // `mostrarPermiteTeleconsulta`); si no, el servidor no lo toca.
            permiteTeleconsulta: mostrarPermiteTeleconsulta ? permiteTeleconsulta : undefined,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setLugarError(data.error ?? "No se pudo guardar el lugar.");
        return;
      }
      setLugares((prev) =>
        editingLugar
          ? prev.map((l) => (l.id === data.lugar.id ? data.lugar : l))
          : [...prev, data.lugar]
      );
      if (!editingLugar) setActiveLugarId(data.lugar.id);
      setLugarOpen(false);
      // Mi perfil resume las prácticas desde el server (tab "Información pública").
      router.refresh();
    } finally {
      setSavingLugar(false);
    }
  }

  async function handleEliminarLugar() {
    if (!deleteLugarTarget) return;
    setDeletingLugar(true);
    try {
      const response = await fetch(`/api/lugares-trabajo/${deleteLugarTarget.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);
      const idsRestantes = lugares
        .filter((l) => l.id !== deleteLugarTarget.id)
        .map((l) => l.id);
      setLugares((prev) => prev.filter((l) => l.id !== deleteLugarTarget.id));
      setBlocks((prev) => prev.filter((b) => b.lugarId !== deleteLugarTarget.id));
      setActiveLugarId((current) =>
        current === deleteLugarTarget.id ? (idsRestantes[0] ?? null) : current
      );
      setNotice(
        data?.softDeleted
          ? `"${lugarLabel(deleteLugarTarget)}" tenía turnos registrados, así que se dio de baja en vez de eliminarse del todo.`
          : null
      );
      setDeleteLugarTarget(null);
      router.refresh();
    } finally {
      setDeletingLugar(false);
    }
  }

  function openAddBlock() {
    setEditingBlock(null);
    setDiaSemana("LUNES");
    setHoraInicio("09:00");
    setHoraFin("17:00");
    setBlockError(null);
    setBlockOpen(true);
  }

  function openEditBlock(block: Block) {
    setEditingBlock(block);
    setDiaSemana(block.diaSemana);
    setHoraInicio(block.horaInicio);
    setHoraFin(block.horaFin);
    setBlockError(null);
    setBlockOpen(true);
  }

  async function handleGuardarBloque() {
    if (!activeLugarId) {
      setBlockError("Elegí un lugar primero.");
      return;
    }
    setBlockError(null);
    setSavingBlock(true);
    try {
      const response = await fetch(
        editingBlock ? `/api/schedule/blocks/${editingBlock.id}` : "/api/schedule/blocks",
        {
          method: editingBlock ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diaSemana, horaInicio, horaFin, lugarId: activeLugarId }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setBlockError(data.error ?? "No se pudo guardar el horario.");
        return;
      }
      setBlocks((prev) =>
        editingBlock
          ? prev.map((b) => (b.id === data.block.id ? data.block : b))
          : [...prev, data.block]
      );
      setBlockOpen(false);
      // Las tabs de Configuración se desmontan al salir: sin refresh, al volver
      // se remonta con los `initialBlocks` viejos del server (y Visibilidad no
      // se entera de que el lugar ya tiene horarios).
      router.refresh();
    } finally {
      setSavingBlock(false);
    }
  }

  async function handleEliminarBloque() {
    if (!deleteBlockTarget) return;
    setDeletingBlock(true);
    setDeleteBlockError(null);
    try {
      const response = await fetch(`/api/schedule/blocks/${deleteBlockTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        setDeleteBlockError(data.error ?? "No se pudo eliminar el horario.");
        return;
      }
      setBlocks((prev) => prev.filter((b) => b.id !== deleteBlockTarget.id));
      setDeleteBlockTarget(null);
      router.refresh();
    } finally {
      setDeletingBlock(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Duración de turnos" icon={Clock}>
        <p className="text-xs text-muted-foreground">
          Cuántos minutos dura cada turno disponible para reservar.
        </p>

        <div className="flex flex-col gap-2">
          <Label>Minutos por turno</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={5}
              max={240}
              className="max-w-32"
              value={slotDurationMinutes}
              onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
            />
            <Button
              type="button"
              onClick={handleGuardarDuracion}
              disabled={savingDuration || slotDurationMinutes === savedDurationMinutes}
            >
              {savingDuration ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-dashed border-border pt-3">
          <div className="flex items-center gap-3">
            <Switch
              id="sobreturnos-habilitados"
              checked={sobreturnosHabilitados}
              onCheckedChange={handleToggleSobreturnos}
              disabled={savingSobreturnos}
            />
            <Label htmlFor="sobreturnos-habilitados" className="font-normal">
              Permitir sobreturnos
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Con esto habilitado, vas a poder agregar turnos extra en el medio de un bloque o al
            final, además de los turnos normales de la grilla.
          </p>
          {sobreturnosError && <p className="text-sm text-destructive">{sobreturnosError}</p>}
        </div>

        {durationError && <p className="text-sm text-destructive">{durationError}</p>}
        {rescheduledCount !== null && (
          <p className="text-sm text-muted-foreground">
            {rescheduledCount === 0
              ? "Duración actualizada."
              : `Duración actualizada y ${rescheduledCount} turno${rescheduledCount === 1 ? "" : "s"} reprogramado${rescheduledCount === 1 ? "" : "s"}.`}{" "}
            {rescheduledCount > 0 && (
              <>
                Se recomienda notificar a los pacientes afectados desde{" "}
                <Link href="/recordatorios" className="font-medium text-primary hover:underline">
                  Recordatorios
                </Link>
                .
              </>
            )}
          </p>
        )}
      </SettingsSection>

      <SettingsSection
        title="Mi práctica"
        description="Cargá los lugares donde atendés y, para cada uno, sus horarios. Los horarios no pueden superponerse entre sí, ni siquiera entre lugares distintos."
        icon={Building2}
      >
        {notice && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
            {notice}
          </p>
        )}

        {lugares.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no cargaste ningún lugar.</p>
        )}

        {lugares.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
            {lugares.map((lugar) => (
              <button
                key={lugar.id}
                type="button"
                onClick={() => setActiveLugarId(lugar.id)}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
                  lugar.id === activeLugarId
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {lugarLabel(lugar)}
              </button>
            ))}
            <button
              type="button"
              onClick={openCreateLugar}
              className="flex shrink-0 items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Plus className="size-3.5" />
              Agregar lugar de atención
            </button>
          </div>
        )}

        {lugares.length === 0 && (
          <div>
            <Button type="button" onClick={openCreateLugar}>
              <Plus className="size-4" />
              Agregar lugar de atención
            </Button>
          </div>
        )}

        {lugarActivo && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                      lugarActivo.tipo === "PARTICULAR" && "bg-muted text-muted-foreground",
                      lugarActivo.tipo === "CONSULTORIO" && "bg-primary/10 text-primary",
                      lugarActivo.tipo === "VIRTUAL" && "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    )}
                  >
                    {LUGAR_TIPO_LABEL[lugarActivo.tipo]}
                  </span>
                  <span className="text-sm font-medium">{lugarLabel(lugarActivo)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openEditLugar(lugarActivo)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Editar lugar"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteLugarTarget(lugarActivo);
                      setNotice(null);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Eliminar lugar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="h-px bg-border/60" />

              <div className="flex flex-col gap-1.5">
                {lugarActivo.tipo === "VIRTUAL" ? (
                  <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Video className="size-3.5 shrink-0" />
                    Videollamada dentro de Semio 360 · el paciente recibe el link para entrar
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    {lugarActivo.direccion}
                  </span>
                )}
                {lugarActivo.telefono && (
                  <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Phone className="size-3.5 shrink-0" />
                    {lugarActivo.telefono}
                  </span>
                )}
                {lugarActivo.tipo !== "VIRTUAL" && lugarActivo.permiteTeleconsulta && (
                  <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <Video className="size-3.5 shrink-0" />
                    Sus turnos se pueden pasar a teleconsulta
                  </span>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                <CalendarDays className="size-4" />
                Horarios
              </span>

              {blocksDelLugarActivo.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Todavía no cargaste horarios para este lugar.
                </p>
              )}

              {blocksDelLugarActivo.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <span className="text-sm">
                    <strong>{DIA_LABELS[block.diaSemana]}</strong> · {block.horaInicio} a{" "}
                    {block.horaFin}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => openEditBlock(block)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Editar horario"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteBlockTarget(block);
                        setDeleteBlockError(null);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Eliminar horario"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <Button type="button" onClick={openAddBlock}>
                <Plus className="size-4" />
                Agregar horario
              </Button>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* Alta/edición de lugar */}
      <Dialog open={lugarOpen} onOpenChange={setLugarOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLugar ? "Editar lugar" : "Nuevo lugar"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Tipo *</Label>
              {(() => {
                // Un lugar que ya es de Teleconsulta se sigue mostrando como tal.
                const mostrarVirtual = puedeCrearLugarVirtual || tipo === "VIRTUAL";
                const opciones: {
                  value: LugarTrabajoTipo;
                  id: string;
                  label: string;
                  icon: typeof House;
                  disabled?: boolean;
                  title?: string;
                }[] = [
                  {
                    value: "PARTICULAR",
                    id: "lugar-particular",
                    label: "Particular",
                    icon: House,
                    disabled: particularDeshabilitado,
                    title: particularDeshabilitado
                      ? mensajeLugarDuplicado("PARTICULAR")
                      : undefined,
                  },
                  {
                    value: "CONSULTORIO",
                    id: "lugar-consultorio",
                    label: "Consultorio",
                    icon: Building2,
                  },
                  ...(mostrarVirtual
                    ? [
                        {
                          value: "VIRTUAL" as const,
                          id: "lugar-virtual",
                          label: "Teleconsulta",
                          icon: Video,
                          disabled: virtualDeshabilitado,
                          title: virtualDeshabilitado
                            ? mensajeLugarDuplicado("VIRTUAL")
                            : undefined,
                        },
                      ]
                    : []),
                ];
                return (
                  <RadioGroup
                    value={tipo}
                    onValueChange={(v) => setTipo(v as LugarTrabajoTipo)}
                    className={cn("grid gap-2", mostrarVirtual ? "grid-cols-3" : "grid-cols-2")}
                  >
                    {opciones.map((o) => {
                      const Icon = o.icon;
                      return (
                        <label
                          key={o.value}
                          htmlFor={o.id}
                          title={o.title}
                          className={cn(
                            "relative flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border bg-background px-2 pt-4 pb-3 text-sm transition-colors",
                            "hover:border-primary/40 hover:bg-muted/40",
                            "has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5 has-[[data-checked]]:text-primary",
                            "has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:opacity-50 has-[[data-disabled]]:hover:border-border has-[[data-disabled]]:hover:bg-background",
                          )}
                        >
                          <RadioGroupItem
                            value={o.value}
                            id={o.id}
                            disabled={o.disabled}
                            className="absolute top-2 right-2 size-3.5"
                          />
                          <Icon className="size-5" />
                          <span className="font-medium">{o.label}</span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                );
              })()}
            </div>

            {tipo === "VIRTUAL" && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm font-medium">Videollamada dentro de Semio 360</p>
                <ul className="mt-2 flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-px size-3.5 shrink-0 text-primary" />
                    Cada turno tiene su propia sala privada.
                  </li>
                  <li className="flex items-start gap-2">
                    <Link2 className="mt-px size-3.5 shrink-0 text-primary" />
                    El paciente entra con el link del turno.
                  </li>
                  <li className="flex items-start gap-2">
                    <MonitorSmartphone className="mt-px size-3.5 shrink-0 text-primary" />
                    No hace falta descargar nada: funciona desde el navegador.
                  </li>
                </ul>
              </div>
            )}

            {tipo === "CONSULTORIO" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lugar-nombre">Nombre del consultorio *</Label>
                <Input
                  id="lugar-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={triedSubmitLugar && !nombre.trim() ? "border-destructive" : undefined}
                />
              </div>
            )}

            {tipo !== "VIRTUAL" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lugar-direccion">Dirección *</Label>
                <AddressAutocomplete
                  id="lugar-direccion"
                  value={direccion}
                  onChangeText={handleDireccionTextChange}
                  onSelect={handleDireccionSelect}
                  className={triedSubmitLugar && !direccion.trim() ? "border-destructive" : undefined}
                />
              </div>
            )}

            {tipo !== "VIRTUAL" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lugar-telefono">Teléfono *</Label>
                <Input
                  id="lugar-telefono"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(filterTelefono(e.target.value))}
                  className={triedSubmitLugar && !telefono.trim() ? "border-destructive" : undefined}
                />
              </div>
            )}

            {mostrarPermiteTeleconsulta && (
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">
                <Switch
                  id="lugar-permite-teleconsulta"
                  className="mt-0.5"
                  checked={permiteTeleconsulta}
                  onCheckedChange={setPermiteTeleconsulta}
                />
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="lugar-permite-teleconsulta" className="flex items-center gap-1.5 font-medium">
                    <Repeat className="size-3.5 text-muted-foreground" />
                    Permitir pasar turnos a teleconsulta
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Un turno presencial de este lugar se puede atender por videollamada, sin cambiarle el
                    lugar ni el horario.
                  </p>
                </div>
              </div>
            )}

            {lugarError && <p className="text-sm text-destructive">{lugarError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleGuardarLugar} disabled={savingLugar}>
              {savingLugar ? "Guardando..." : editingLugar ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar lugar */}
      <Dialog
        open={deleteLugarTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteLugarTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-amber-600" />
              Eliminar lugar
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vas a eliminar los horarios de trabajo cargados para{" "}
            <strong>{deleteLugarTarget ? lugarLabel(deleteLugarTarget) : ""}</strong>. Si tenías
            turnos agendados que dependían de esos horarios van a seguir existiendo, pero
            convendría revisarlos antes de continuar.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteLugarTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleEliminarLugar}
              disabled={deletingLugar}
            >
              {deletingLugar ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alta/edición de horario */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBlock ? "Editar horario" : "Nuevo horario"} — {lugarActivo ? lugarLabel(lugarActivo) : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Día</Label>
              <Select value={diaSemana} onValueChange={(v) => setDiaSemana(v as DiaSemana)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{() => DIA_LABELS[diaSemana]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DIA_SEMANA_VALUES.map((dia) => (
                    <SelectItem key={dia} value={dia}>
                      {DIA_LABELS[dia]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Entrada</Label>
                <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Salida</Label>
                <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
              </div>
            </div>
            {blockError && <p className="text-sm text-destructive">{blockError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleGuardarBloque} disabled={savingBlock}>
              {savingBlock
                ? editingBlock
                  ? "Guardando..."
                  : "Agregando..."
                : editingBlock
                  ? "Guardar"
                  : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar horario */}
      <Dialog open={deleteBlockTarget !== null} onOpenChange={(o) => !o && setDeleteBlockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar horario</DialogTitle>
          </DialogHeader>
          {deleteBlockTarget && (
            <p className="text-sm text-muted-foreground">
              Se eliminará el horario de <strong>{DIA_LABELS[deleteBlockTarget.diaSemana]}</strong> de{" "}
              {deleteBlockTarget.horaInicio} a {deleteBlockTarget.horaFin}.
            </p>
          )}
          {deleteBlockError && <p className="text-sm text-destructive">{deleteBlockError}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteBlockTarget(null);
                setDeleteBlockError(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleEliminarBloque}
              disabled={deletingBlock}
            >
              {deletingBlock ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reprogramar turnos por cambio de duración */}
      <Dialog
        open={reschedulePreview !== null}
        onOpenChange={(o) => {
          if (!o) {
            setReschedulePreview(null);
            setPendingDuration(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-amber-600" />
              Reprogramar turnos
            </DialogTitle>
          </DialogHeader>
          {pendingDuration !== null && (
            <p className="shrink-0 text-sm text-muted-foreground">
              {pendingDuration < savedDurationMinutes
                ? `Al achicar la duración a ${pendingDuration} minutos, los turnos agendados de hoy en adelante que ya no encajen en la nueva grilla se van a mover hacia adelante, al próximo turno libre más cercano.`
                : `Al agrandar la duración a ${pendingDuration} minutos, los turnos agendados de hoy en adelante se van a atrasar (incluso pudiendo pasar a otro día), reprogramados lo más cerca posible de su horario actual.`}
            </p>
          )}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
            {reschedulePreview?.map((item) => (
              <div key={item.turnoId} className="rounded-md border p-2 text-sm">
                <p className="font-medium">{item.nombreYApellido}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFechaHora(item.oldInicio)} → {formatFechaHora(item.newInicio)}
                </p>
              </div>
            ))}
          </div>
          <p className="shrink-0 text-sm text-muted-foreground">
            Se recomienda notificar a los pacientes afectados sobre el cambio de turno.
          </p>
          {durationError && <p className="shrink-0 text-sm text-destructive">{durationError}</p>}
          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReschedulePreview(null);
                setPendingDuration(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmarReprogramacion} disabled={applyingReschedule}>
              {applyingReschedule ? "Reprogramando..." : "Confirmar y reprogramar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
