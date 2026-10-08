"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  IdCard,
  Lock,
  Globe2,
  CalendarDays,
  Link2,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
import { CompartirAgendaButton } from "@/components/compartir-agenda-button";
import { irAConfiguracionTab } from "@/lib/configuracion-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxClear,
  ComboboxContent,
  ComboboxItem,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TITULO_CORTESIA_LABELS,
  TITULO_CORTESIA_OPTIONS,
  type TituloCortesia,
} from "@/lib/titulo-cortesia";
import { ESPECIALIDAD_OPTIONS, type Especialidad } from "@/lib/especialidad";
import { cn } from "@/lib/utils";
import { RESERVA_PUBLICA_SEMANAS_OPCIONES } from "@/lib/perfil-schema";

type EspecialidadOption = (typeof ESPECIALIDAD_OPTIONS)[number];
type LugarResumen = {
  id: string;
  tipo: "PARTICULAR" | "CONSULTORIO";
  nombre: string | null;
  direccion: string;
  telefono: string;
  ciudad: string | null;
  perfilVisible: boolean;
  reservaPublicaHabilitada: boolean;
  publicSlug: string | null;
  // Si tiene al menos un bloque de horario cargado en "Mi práctica".
  tieneHorarios: boolean;
};

type Props = {
  email: string;
  initialFotoPerfilBase64: string | null;
  initialTituloCortesia: TituloCortesia | null;
  initialNombre: string;
  initialApellido: string;
  initialEspecialidad: Especialidad | null;
  initialNroMatricula: string;
  initialPerfilPublico: boolean;
  // Prácticas activas del médico -- de acá salen consultorio, dirección y
  // teléfono del perfil público. Se leen siempre de las props (no de estado
  // local) para reflejar los cambios hechos en "Mi práctica" tras un refresh.
  lugares: LugarResumen[];
  // Catálogo completo de coberturas y las que ya eligió el médico.
  prepagas: { id: string; nombre: string; nombreCompleto: string | null }[];
  initialPrepagaIds: string[];
  initialBiografia: string | null;
  initialReservaPublicaHabilitada: boolean;
  initialReservaPublicaSemanas: number;
  initialPublicSlug: string | null;
};

export function MiPerfilSettings({
  email,
  initialFotoPerfilBase64,
  initialTituloCortesia,
  initialNombre,
  initialApellido,
  initialEspecialidad,
  initialNroMatricula,
  initialPerfilPublico,
  lugares,
  prepagas,
  initialPrepagaIds,
  initialBiografia,
  initialReservaPublicaHabilitada,
  initialReservaPublicaSemanas,
  initialPublicSlug,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fotoPerfilBase64, setFotoPerfilBase64] = useState(initialFotoPerfilBase64);
  const [fotoSaving, setFotoSaving] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);

  const [tituloCortesia, setTituloCortesia] = useState<TituloCortesia | "">(
    initialTituloCortesia ?? ""
  );
  const [nombre, setNombre] = useState(initialNombre);
  const [apellido, setApellido] = useState(initialApellido);
  const [especialidad, setEspecialidad] = useState<Especialidad | "">(initialEspecialidad ?? "");
  const [nroMatricula, setNroMatricula] = useState(initialNroMatricula);

  // Coberturas con las que trabaja -- se guardan con "Guardar cambios".
  const [prepagaIds, setPrepagaIds] = useState<string[]>(initialPrepagaIds);
  const [prepagaBusqueda, setPrepagaBusqueda] = useState("");
  const prepagaOptions = prepagas
    .filter((p) => !prepagaIds.includes(p.id))
    .map((p) => ({
      value: p.id,
      label:
        p.nombreCompleto && p.nombreCompleto !== p.nombre
          ? `${p.nombre} (${p.nombreCompleto})`
          : p.nombre,
    }));
  const prepagasElegidas = prepagaIds
    .map((id) => prepagas.find((p) => p.id === id))
    .filter((p): p is (typeof prepagas)[number] => !!p)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const [perfilPublico, setPerfilPublico] = useState(initialPerfilPublico);
  const [biografia, setBiografia] = useState(initialBiografia ?? "");
  const sinPracticas = lugares.length === 0;
  // Lugares que se muestran en el perfil público -- se guardan junto con el
  // resto del perfil (botón "Guardar cambios"), a diferencia de la agenda.
  const [lugaresVisibles, setLugaresVisibles] = useState<string[]>(() =>
    lugares.filter((l) => l.perfilVisible).map((l) => l.id)
  );
  const sinLugaresVisibles = !sinPracticas && lugaresVisibles.length === 0;

  function togglePerfilPublico(checked: boolean) {
    setPerfilPublico(checked);
    // Al activarlo, todos los lugares arrancan visibles.
    if (checked) setLugaresVisibles(lugares.map((l) => l.id));
  }

  function toggleLugarVisible(id: string, checked: boolean) {
    const next = checked ? [...lugaresVisibles, id] : lugaresVisibles.filter((x) => x !== id);
    setLugaresVisibles(next);
    // Sin ningún lugar visible el perfil no tiene qué mostrar: se apaga el principal.
    if (next.length === 0) setPerfilPublico(false);
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [triedSubmit, setTriedSubmit] = useState(false);

  // Solo estos campos dependen de "Guardar cambios" (el resto se guarda al
  // instante). El botón se habilita únicamente si alguno difiere de lo guardado.
  const perfilSnapshot = JSON.stringify({
    tituloCortesia,
    nombre,
    apellido,
    especialidad,
    nroMatricula,
    perfilPublico,
    biografia,
    lugaresVisibles: [...lugaresVisibles].sort(),
    prepagaIds: [...prepagaIds].sort(),
  });
  const [perfilGuardado, setPerfilGuardado] = useState(perfilSnapshot);
  const hayCambios = perfilSnapshot !== perfilGuardado;

  const [reservaPublicaHabilitada, setReservaPublicaHabilitada] = useState(
    initialReservaPublicaHabilitada
  );
  const [reservaPublicaSemanas, setReservaPublicaSemanas] = useState(initialReservaPublicaSemanas);
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);
  const [agendaPublicaSaving, setAgendaPublicaSaving] = useState(false);
  const [agendaPublicaError, setAgendaPublicaError] = useState<string | null>(null);
  // Qué link se acaba de copiar (`"general"` o el id de un lugar), para
  // mostrar "¡Copiado!" solo en ese botón.
  const [copiado, setCopiado] = useState<string | null>(null);
  // Turnos online por lugar -- se guardan al instante, como el switch general.
  const [reservaPorLugar, setReservaPorLugar] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lugares.map((l) => [l.id, l.reservaPublicaHabilitada]))
  );
  const [lugarAgendaSaving, setLugarAgendaSaving] = useState<string | null>(null);
  // Sin ningún lugar con horarios no hay turnos que ofrecer: los links no sirven.
  const sinLugaresConHorarios = !lugares.some((l) => l.tieneHorarios);
  // Con un solo lugar no hay nada que elegir: alcanza con el link general.
  const variosLugares = lugares.length > 1;

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const iniciales = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || "?";

  function handleElegirFoto() {
    fileInputRef.current?.click();
  }

  async function handleFotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFotoError(null);
    if (file.size > 2 * 1024 * 1024) {
      setFotoError("La imagen es demasiado grande (máx. 2MB).");
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    setFotoSaving(true);
    try {
      const response = await fetch("/api/perfil/foto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoPerfil: dataUrl }),
      });
      const data = await response.json();
      if (!response.ok) {
        setFotoError(data.error ?? "No se pudo subir la foto.");
        return;
      }
      setFotoPerfilBase64(dataUrl);
      router.refresh();
    } catch {
      setFotoError("No se pudo conectar con el servidor.");
    } finally {
      setFotoSaving(false);
    }
  }

  async function handleQuitarFoto() {
    setFotoError(null);
    setFotoSaving(true);
    try {
      const response = await fetch("/api/perfil/foto", { method: "DELETE" });
      if (!response.ok) {
        setFotoError("No se pudo quitar la foto.");
        return;
      }
      setFotoPerfilBase64(null);
      router.refresh();
    } catch {
      setFotoError("No se pudo conectar con el servidor.");
    } finally {
      setFotoSaving(false);
    }
  }

  async function handleGuardar() {
    setTriedSubmit(true);
    setError(null);
    setFieldErrors({});

    if (!tituloCortesia || !nombre.trim() || !apellido.trim() || !especialidad || !nroMatricula.trim()) {
      setError("Completá los campos obligatorios de Información personal y Datos profesionales.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tituloCortesia,
          nombre,
          apellido,
          especialidad,
          nroMatricula,
          perfilPublico,
          biografia,
          lugaresVisibles,
          prepagaIds,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el perfil.");
        if (data.issues?.fieldErrors) {
          const flat: Record<string, string> = {};
          for (const [key, messages] of Object.entries(data.issues.fieldErrors)) {
            if (Array.isArray(messages) && messages[0]) flat[key] = messages[0];
          }
          setFieldErrors(flat);
        }
        return;
      }
      setTriedSubmit(false);
      setPerfilGuardado(perfilSnapshot);
      setPublicSlug(data.publicSlug);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleReservaPublica(checked: boolean) {
    const previous = reservaPublicaHabilitada;
    setReservaPublicaHabilitada(checked);
    setAgendaPublicaSaving(true);
    setAgendaPublicaError(null);
    try {
      const response = await fetch("/api/perfil/agenda-publica", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaPublicaHabilitada: checked }),
      });
      const data = await response.json();
      if (!response.ok) {
        setReservaPublicaHabilitada(previous);
        setAgendaPublicaError(data.error ?? "No se pudo guardar el cambio.");
        return;
      }
      setReservaPublicaHabilitada(data.reservaPublicaHabilitada);
      setPublicSlug(data.publicSlug);
      if (data.reservaPublicaHabilitada) {
        setReservaPorLugar(Object.fromEntries(lugares.map((l) => [l.id, true])));
        router.refresh();
      }
    } catch {
      setReservaPublicaHabilitada(previous);
      setAgendaPublicaError("No se pudo conectar con el servidor.");
    } finally {
      setAgendaPublicaSaving(false);
    }
  }

  async function handleCambiarSemanas(semanas: number) {
    const previous = reservaPublicaSemanas;
    if (semanas === previous) return;
    setReservaPublicaSemanas(semanas);
    setAgendaPublicaSaving(true);
    setAgendaPublicaError(null);
    try {
      const response = await fetch("/api/perfil/agenda-publica", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaPublicaSemanas: semanas }),
      });
      const data = await response.json();
      if (!response.ok) {
        setReservaPublicaSemanas(previous);
        setAgendaPublicaError(data.error ?? "No se pudo guardar el cambio.");
        return;
      }
      setReservaPublicaSemanas(data.reservaPublicaSemanas);
    } catch {
      setReservaPublicaSemanas(previous);
      setAgendaPublicaError("No se pudo conectar con el servidor.");
    } finally {
      setAgendaPublicaSaving(false);
    }
  }

  // Último día que ve el paciente (hoy + N semanas - 1), en hora de Buenos
  // Aires para que server y cliente rendericen lo mismo.
  const [hoy] = useState(() => Date.now());
  const fechaLimiteReserva = new Date(
    hoy + (reservaPublicaSemanas * 7 - 1) * 24 * 60 * 60 * 1000
  ).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  // El server no conoce `window.location.origin` -- arranca mostrando el
  // dominio de producción (igual en server y cliente, sin mismatch de
  // hidratación) y recién en el cliente, ya montado, lo corrige al origin
  // real (útil para probar el link en local). Mismo criterio que el filtro
  // recordado en PatientSearch.
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const nombreMedico = [initialTituloCortesia, initialNombre, initialApellido]
    .filter(Boolean)
    .join(" ");
  const publicLink = publicSlug ? `${origin ?? "semio360.com"}/directorio/${publicSlug}` : null;

  async function handleToggleReservaLugar(lugarId: string, checked: boolean) {
    const previous = reservaPorLugar[lugarId];
    setReservaPorLugar((prev) => ({ ...prev, [lugarId]: checked }));
    setLugarAgendaSaving(lugarId);
    setAgendaPublicaError(null);
    try {
      const response = await fetch(`/api/lugares-trabajo/${lugarId}/agenda-publica`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaPublicaHabilitada: checked }),
      });
      const data = await response.json();
      if (!response.ok) {
        setReservaPorLugar((prev) => ({ ...prev, [lugarId]: previous }));
        setAgendaPublicaError(data.error ?? "No se pudo guardar el cambio.");
        return;
      }
      // Sin ningún lugar con turnos online, la agenda pública no tiene sentido.
      const quedaAlguno = lugares.some((l) =>
        l.id === lugarId ? checked : (reservaPorLugar[l.id] ?? false)
      );
      if (!checked && !quedaAlguno && reservaPublicaHabilitada) {
        await handleToggleReservaPublica(false);
      }
    } catch {
      setReservaPorLugar((prev) => ({ ...prev, [lugarId]: previous }));
      setAgendaPublicaError("No se pudo conectar con el servidor.");
    } finally {
      setLugarAgendaSaving(null);
    }
  }

  async function handleCopiar(clave: string, link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(clave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      // Portapapeles no disponible (permiso denegado, contexto no seguro,
      // etc.) -- no hay mucho más para hacer que dejar el link visible para
      // copiarlo a mano.
    }
  }

  function openPasswordDialog() {
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setPasswordError(null);
    setPasswordOpen(true);
  }

  async function handleGuardarPassword() {
    setPasswordError(null);
    if (!passwordActual) {
      setPasswordError("Ingresá tu contraseña actual.");
      return;
    }
    if (passwordNueva.length < 6) {
      setPasswordError("La contraseña nueva debe tener al menos 6 caracteres.");
      return;
    }
    if (passwordNueva !== passwordConfirmar) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch("/api/perfil/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual, passwordNueva }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPasswordError(data.error ?? "No se pudo cambiar la contraseña.");
        return;
      }
      setPasswordOpen(false);
    } catch {
      setPasswordError("No se pudo conectar con el servidor.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFotoChange}
      />

      <SettingsSection title="Información personal" icon={IdCard}>
        <div className="flex items-center gap-4">
          <div className="flex size-17 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {fotoPerfilBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPerfilBase64} alt="Foto de perfil" className="size-full object-cover" />
            ) : (
              iniciales
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fotoSaving}
                onClick={handleElegirFoto}
              >
                {fotoSaving ? "Subiendo..." : "Cambiar foto"}
              </Button>
              {fotoPerfilBase64 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={fotoSaving}
                  onClick={handleQuitarFoto}
                >
                  Quitar
                </Button>
              )}
            </div>
            <span className="text-xs text-muted-foreground">JPG o PNG. Recomendado 400x400px.</span>
            {fotoError && <p className="text-xs text-destructive">{fotoError}</p>}
          </div>
        </div>

        <div className="grid grid-cols-[7.5rem_1fr_1fr] gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-titulo">Título *</Label>
            <Select
              value={tituloCortesia}
              onValueChange={(v) => setTituloCortesia(v as TituloCortesia)}
            >
              <SelectTrigger id="perfil-titulo" className="w-full">
                <SelectValue>
                  {(v: TituloCortesia | "") => (v ? TITULO_CORTESIA_LABELS[v] : "Elegir...")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TITULO_CORTESIA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-nombre">Nombre *</Label>
            <Input
              id="perfil-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={triedSubmit && !nombre.trim() ? "border-destructive" : undefined}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-apellido">Apellido *</Label>
            <Input
              id="perfil-apellido"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className={triedSubmit && !apellido.trim() ? "border-destructive" : undefined}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Datos profesionales" icon={Briefcase}>
        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-especialidad">Especialidad *</Label>
            <Combobox
              items={ESPECIALIDAD_OPTIONS}
              value={ESPECIALIDAD_OPTIONS.find((o) => o.value === especialidad) ?? null}
              onValueChange={(item) =>
                setEspecialidad((item as EspecialidadOption | null)?.value ?? "")
              }
            >
              <ComboboxInputGroup>
                <ComboboxInput id="perfil-especialidad" placeholder="Buscar especialidad..." />
                <ComboboxClear aria-label="Limpiar especialidad" />
                <ComboboxTrigger aria-label="Abrir especialidades" />
              </ComboboxInputGroup>
              <ComboboxContent>
                {(option: EspecialidadOption) => (
                  <ComboboxItem key={option.value} value={option}>
                    {option.label}
                  </ComboboxItem>
                )}
              </ComboboxContent>
            </Combobox>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-matricula">Nro Matrícula *</Label>
            <Input
              id="perfil-matricula"
              value={nroMatricula}
              onChange={(e) => setNroMatricula(e.target.value)}
              className={triedSubmit && !nroMatricula.trim() ? "border-destructive" : undefined}
            />
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Coberturas" icon={ShieldCheck}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="perfil-prepagas">Prepagas y obras sociales con las que trabajás</Label>
          <Combobox
            items={prepagaOptions}
            value={null}
            inputValue={prepagaBusqueda}
            onInputValueChange={setPrepagaBusqueda}
            onValueChange={(item) => {
              const id = (item as { value: string } | null)?.value;
              if (id) setPrepagaIds((prev) => [...prev, id]);
              setPrepagaBusqueda("");
            }}
          >
            <ComboboxInputGroup>
              <ComboboxInput id="perfil-prepagas" placeholder="Buscar cobertura..." />
              <ComboboxTrigger aria-label="Abrir coberturas" />
            </ComboboxInputGroup>
            <ComboboxContent>
              {(option: (typeof prepagaOptions)[number]) => (
                <ComboboxItem key={option.value} value={option}>
                  {option.label}
                </ComboboxItem>
              )}
            </ComboboxContent>
          </Combobox>
        </div>
        {prepagasElegidas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
            Todavía no cargaste ninguna. Buscá arriba para empezar.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-1.5" aria-label="Coberturas elegidas">
            {prepagasElegidas.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-label={`Quitar ${p.nombre}`}
                  onClick={() => setPrepagaIds((prev) => prev.filter((id) => id !== p.id))}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 py-1 pr-1.5 pl-3 text-[12.5px] font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {p.nombre}
                  <span className="flex size-[18px] items-center justify-center rounded-full group-hover:bg-primary group-hover:text-primary-foreground">
                    <X className="size-3" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          {prepagasElegidas.length === 1 ? "1 cobertura" : `${prepagasElegidas.length} coberturas`}
        </p>
      </SettingsSection>

      <SettingsSection title="Seguridad" icon={Lock}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="perfil-email">Email</Label>
          <Input id="perfil-email" value={email} disabled />
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Contraseña</span>
            <span className="text-xs text-muted-foreground">••••••••••</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openPasswordDialog}>
            Cambiar contraseña
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title="Información pública" icon={Globe2}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Perfil público</span>
            <p className="max-w-md text-xs text-muted-foreground">
              Aparecerá en el directorio público de Semio360 con los datos de tus prácticas.
            </p>
          </div>
          <Switch checked={perfilPublico} onCheckedChange={togglePerfilPublico} />
        </div>

        {perfilPublico && (
          <div className="flex flex-col gap-3 border-t border-dashed border-border pt-3">
            {sinPracticas ? (
              <div
                role="alert"
                className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <div className="flex min-w-48 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold">Tu perfil todavía no es público</span>
                  <span className="text-xs">
                    No aparecerá en el directorio hasta que configures tus prácticas.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => irAConfiguracionTab("practica")}
                >
                  Configurar prácticas
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                    Lugares visibles en tu perfil
                  </span>
                  <button
                    type="button"
                    onClick={() => irAConfiguracionTab("practica")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Editar prácticas
                  </button>
                </div>
                <ul className="flex flex-col divide-y divide-border/60">
                  {lugares.map((lugar) => {
                    const visible = lugaresVisibles.includes(lugar.id);
                    return (
                      <li
                        key={lugar.id}
                        className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                      >
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span
                            className={cn("text-sm font-medium", !visible && "text-muted-foreground")}
                          >
                            {lugar.nombre ?? "Consulta particular"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {lugar.direccion} · {lugar.telefono}
                          </span>
                        </div>
                        <Switch
                          checked={visible}
                          onCheckedChange={(checked) => toggleLugarVisible(lugar.id, checked)}
                          aria-label={`Mostrar ${lugar.nombre ?? "Consulta particular"} en el perfil`}
                        />
                      </li>
                    );
                  })}
                </ul>
                {sinLugaresVisibles && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Ningún lugar está visible: tu perfil no aparecerá en el directorio hasta que
                    muestres al menos uno.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5 mt-2">
              <Label htmlFor="perfil-bio">Biografía</Label>
              <Textarea
                id="perfil-bio"
                rows={4}
                value={biografia}
                onChange={(e) => setBiografia(e.target.value)}
              />
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Agenda pública" icon={CalendarDays}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Permitir que cualquiera reserve un turno</span>
            <p className="max-w-md text-xs text-muted-foreground">
              Los visitantes podrán agendar un turno desde tu link público, sin necesidad de
              contactarte.
            </p>
          </div>
          <Switch
            checked={reservaPublicaHabilitada}
            onCheckedChange={handleToggleReservaPublica}
            disabled={agendaPublicaSaving}
          />
        </div>
        {agendaPublicaError && <p className="text-xs text-destructive">{agendaPublicaError}</p>}

        {reservaPublicaHabilitada && sinLugaresConHorarios && (
          <div
            role="alert"
            className="flex flex-wrap items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="flex min-w-48 flex-1 flex-col gap-0.5">
              <span className="text-sm font-semibold">Tu agenda todavía no está disponible</span>
              <span className="text-xs">
                Nadie podrá reservar turnos hasta que configures al menos un lugar de atención con
                horarios.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => irAConfiguracionTab("practica")}
            >
              Configurar lugares
            </Button>
          </div>
        )}

        {reservaPublicaHabilitada && !sinLugaresConHorarios && variosLugares && (
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Lugares con turnos online
            </span>
            <ul className="flex flex-col divide-y divide-border/60">
              {lugares.map((lugar) => {
                const habilitado = reservaPorLugar[lugar.id] ?? false;
                const nombreLugar = lugar.nombre ?? "Consulta particular";
                const linkLugar =
                  publicSlug && lugar.publicSlug
                    ? `${origin ?? "semio360.com"}/directorio/${publicSlug}/${lugar.publicSlug}`
                    : null;
                return (
                  <li key={lugar.id} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className={cn("text-sm font-medium", !habilitado && "text-muted-foreground")}
                        >
                          {nombreLugar}
                        </span>
                        {!habilitado && (
                          <span className="text-xs text-muted-foreground">
                            Sin turnos online. No tiene link.
                          </span>
                        )}
                      </div>
                      <Switch
                        checked={habilitado}
                        onCheckedChange={(checked) => handleToggleReservaLugar(lugar.id, checked)}
                        disabled={lugarAgendaSaving === lugar.id}
                        aria-label={`Turnos online en ${nombreLugar}`}
                      />
                    </div>
                    {habilitado && linkLugar && (
                      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 py-1.5 pr-1.5 pl-3">
                        <Link2 className="size-4 shrink-0 text-primary" />
                        <span className="flex-1 truncate font-mono text-xs text-primary">
                          {linkLugar}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleCopiar(lugar.id, linkLugar)}
                        >
                          {copiado === lugar.id ? "¡Copiado!" : "Copiar"}
                        </Button>
                        <CompartirAgendaButton
                          url={linkLugar}
                          nombreMedico={nombreMedico}
                          lugarNombre={lugar.nombre}
                          variant="outline"
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {reservaPublicaHabilitada && !sinLugaresConHorarios && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">
                Cuánto tiempo hacia adelante se puede reservar
              </span>
              <p className="text-xs text-muted-foreground">
                Los pacientes solo verán turnos libres dentro de este período.
              </p>
            </div>
            <div
              role="group"
              aria-label="Semanas visibles en la agenda pública"
              className="inline-flex w-fit flex-wrap gap-0.5 rounded-lg border border-border bg-muted p-[3px]"
            >
              {RESERVA_PUBLICA_SEMANAS_OPCIONES.map((semanas) => {
                const activo = semanas === reservaPublicaSemanas;
                return (
                  <button
                    key={semanas}
                    type="button"
                    aria-pressed={activo}
                    disabled={agendaPublicaSaving}
                    onClick={() => handleCambiarSemanas(semanas)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default",
                      activo
                        ? "border-border bg-card font-semibold text-foreground shadow"
                        : "border-transparent font-medium text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {semanas === 1 ? "1 semana" : `${semanas} semanas`}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground" suppressHydrationWarning>
              Hoy podrían reservar hasta el {fechaLimiteReserva}.
            </p>
          </div>
        )}

        {reservaPublicaHabilitada && !sinLugaresConHorarios && publicLink && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">Link general</span>
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2">
              <Link2 className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate font-mono text-sm">{publicLink}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleCopiar("general", publicLink)}
              >
                {copiado === "general" ? "¡Copiado!" : "Copiar"}
              </Button>
              <CompartirAgendaButton url={publicLink} nombreMedico={nombreMedico} />
            </div>
            <p className="text-xs text-muted-foreground">
              {variosLugares
                ? "Ofrece todos los lugares con turnos online y el paciente elige uno. Para evitar confusiones, mandale el link del lugar."
                : "Compartilo con tus pacientes para que reserven un turno."}
            </p>
          </div>
        )}
      </SettingsSection>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {Object.keys(fieldErrors).length > 0 && (
        <ul className="text-sm text-destructive">
          {Object.values(fieldErrors).map((msg) => (
            <li key={msg}>{msg}</li>
          ))}
        </ul>
      )}
      <div className="flex justify-end">
        <Button type="button" onClick={handleGuardar} disabled={saving || !hayCambios}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password-actual">Contraseña actual</Label>
              <PasswordInput
                id="password-actual"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password-nueva">Contraseña nueva</Label>
              <PasswordInput
                id="password-nueva"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password-confirmar">Confirmar contraseña nueva</Label>
              <PasswordInput
                id="password-confirmar"
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleGuardarPassword} disabled={passwordSaving}>
              {passwordSaving ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
