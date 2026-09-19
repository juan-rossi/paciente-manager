"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, IdCard, Lock, Globe2, CalendarDays, Link2 } from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type EspecialidadOption = (typeof ESPECIALIDAD_OPTIONS)[number];
type AtencionTipo = "PARTICULAR" | "CONSULTORIO";

type Props = {
  email: string;
  initialFotoPerfilBase64: string | null;
  initialTituloCortesia: TituloCortesia | null;
  initialNombre: string;
  initialApellido: string;
  initialEspecialidad: Especialidad | null;
  initialNroMatricula: string;
  initialPerfilPublico: boolean;
  initialAtencionTipo: AtencionTipo | null;
  initialNombreConsultorio: string | null;
  initialTelefono: string | null;
  initialDireccion: string | null;
  initialCiudad: string | null;
  initialLatitud: number | null;
  initialLongitud: number | null;
  initialBiografia: string | null;
  initialReservaPublicaHabilitada: boolean;
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
  initialAtencionTipo,
  initialNombreConsultorio,
  initialTelefono,
  initialDireccion,
  initialCiudad,
  initialLatitud,
  initialLongitud,
  initialBiografia,
  initialReservaPublicaHabilitada,
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

  const [perfilPublico, setPerfilPublico] = useState(initialPerfilPublico);
  const [atencionTipo, setAtencionTipo] = useState<AtencionTipo | "">(initialAtencionTipo ?? "");
  const [nombreConsultorio, setNombreConsultorio] = useState(initialNombreConsultorio ?? "");
  const [telefono, setTelefono] = useState(initialTelefono ?? "");
  const [direccion, setDireccion] = useState(initialDireccion ?? "");
  const [ciudad, setCiudad] = useState(initialCiudad ?? "");
  const [latitud, setLatitud] = useState(initialLatitud);
  const [longitud, setLongitud] = useState(initialLongitud);
  const [biografia, setBiografia] = useState(initialBiografia ?? "");

  // Escribir en el campo de dirección invalida la ciudad/coordenadas ya
  // guardadas -- se vuelven a completar solas recién cuando el usuario elige
  // una sugerencia real del autocompletado (ver AddressAutocomplete).
  function handleDireccionTextChange(text: string) {
    setDireccion(text);
    setCiudad("");
    setLatitud(null);
    setLongitud(null);
  }

  function handleDireccionSelect(result: {
    direccion: string;
    ciudad: string | null;
    latitud: number | null;
    longitud: number | null;
  }) {
    setDireccion(result.direccion);
    setCiudad(result.ciudad ?? "");
    setLatitud(result.latitud);
    setLongitud(result.longitud);
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [triedSubmit, setTriedSubmit] = useState(false);

  const [reservaPublicaHabilitada, setReservaPublicaHabilitada] = useState(
    initialReservaPublicaHabilitada
  );
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);
  const [agendaPublicaSaving, setAgendaPublicaSaving] = useState(false);
  const [agendaPublicaError, setAgendaPublicaError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

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
    if (perfilPublico) {
      if (!atencionTipo) {
        setError('Elegí cómo atendés en "Información pública".');
        return;
      }
      if (atencionTipo === "CONSULTORIO" && !nombreConsultorio.trim()) {
        setError("Completá el nombre del consultorio.");
        return;
      }
      if (!telefono.trim()) {
        setError('Completá el teléfono en "Información pública".');
        return;
      }
      if (!direccion.trim() || !ciudad.trim()) {
        setError('Elegí una dirección de la lista de sugerencias en "Información pública".');
        return;
      }
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
          atencionTipo: atencionTipo || null,
          nombreConsultorio,
          telefono,
          direccion,
          ciudad,
          latitud,
          longitud,
          biografia,
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
    } catch {
      setReservaPublicaHabilitada(previous);
      setAgendaPublicaError("No se pudo conectar con el servidor.");
    } finally {
      setAgendaPublicaSaving(false);
    }
  }

  const publicLink =
    publicSlug && typeof window !== "undefined"
      ? `${window.location.origin}/directorio/${publicSlug}`
      : publicSlug
        ? `semio360.com/directorio/${publicSlug}`
        : null;

  async function handleCopiarLink() {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
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
    <div className="flex max-w-3xl flex-col gap-5">
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
              Aparecerá en el directorio público de Semio360. Al activarlo, completá los datos de
              abajo.
            </p>
          </div>
          <Switch checked={perfilPublico} onCheckedChange={setPerfilPublico} />
        </div>

        {perfilPublico && (
          <div className="flex flex-col gap-3 border-t border-dashed border-border pt-3">
            <div className="flex flex-col gap-1.5">
              <Label>¿Cómo atendés? *</Label>
              <RadioGroup
                value={atencionTipo}
                onValueChange={(v) => setAtencionTipo(v as AtencionTipo)}
                className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="PARTICULAR" id="atencion-particular" />
                  <Label htmlFor="atencion-particular" className="font-normal">
                    Particular
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="CONSULTORIO" id="atencion-consultorio" />
                  <Label htmlFor="atencion-consultorio" className="font-normal">
                    Consultorio
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {atencionTipo === "CONSULTORIO" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="perfil-consultorio">Nombre del consultorio *</Label>
                <Input
                  id="perfil-consultorio"
                  value={nombreConsultorio}
                  onChange={(e) => setNombreConsultorio(e.target.value)}
                  className={
                    triedSubmit && !nombreConsultorio.trim() ? "border-destructive" : undefined
                  }
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="perfil-direccion">Dirección *</Label>
              <AddressAutocomplete
                id="perfil-direccion"
                value={direccion}
                onChangeText={handleDireccionTextChange}
                onSelect={handleDireccionSelect}
                className={triedSubmit && !direccion.trim() ? "border-destructive" : undefined}
              />
              <span className="text-xs text-muted-foreground">
                Elegí una sugerencia de la lista para completar la ciudad automáticamente.
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="perfil-telefono">Teléfono *</Label>
                <Input
                  id="perfil-telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className={triedSubmit && !telefono.trim() ? "border-destructive" : undefined}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="perfil-ciudad">Ciudad *</Label>
                <Input
                  id="perfil-ciudad"
                  value={ciudad}
                  disabled
                  placeholder="Se completa al elegir la dirección"
                  className={triedSubmit && !ciudad.trim() ? "border-destructive" : undefined}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
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

        {reservaPublicaHabilitada && publicLink && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <Link2 className="size-4 shrink-0 text-primary" />
            <span className="flex-1 truncate font-mono text-sm text-primary">{publicLink}</span>
            <Button type="button" size="sm" onClick={handleCopiarLink}>
              {copiado ? "¡Copiado!" : "Copiar"}
            </Button>
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
        <Button type="button" onClick={handleGuardar} disabled={saving}>
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
