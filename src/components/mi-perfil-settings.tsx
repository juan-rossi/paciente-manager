"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Briefcase, IdCard, Info, ShieldCheck, X } from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ComboboxContent,
  ComboboxItem,
} from "@/components/ui/combobox";
import {
  TITULO_CORTESIA_LABELS,
  TITULO_CORTESIA_OPTIONS,
  type TituloCortesia,
} from "@/lib/titulo-cortesia";
import { ESPECIALIDAD_OPTIONS, type Especialidad } from "@/lib/especialidad";
import { AvisoModeracion, estadoAviso, type EstadoAvisoModeracion } from "@/components/aviso-moderacion";

type Props = {
  initialFotoPerfilBase64: string | null;
  // Si la foto cargada todavía espera revisión (o se rechazó) para el perfil público.
  initialModeracionFoto: EstadoAvisoModeracion;
  initialTituloCortesia: TituloCortesia | null;
  initialNombre: string;
  initialApellido: string;
  initialEspecialidad: Especialidad | null;
  initialNroMatricula: string;
  initialMontoConsultaParticular: number | null;
  // Catálogo completo de coberturas y las que ya eligió el médico.
  prepagas: { id: string; nombre: string; nombreCompleto: string | null }[];
  initialPrepagaIds: string[];
  // Lo que paga cada cobertura por consulta y el plus (reporte de ingresos).
  initialArancelesCobertura: { prepagaId: string; montoConsulta: number | null; montoPlus: number | null }[];
};

type ArancelEditable = { consulta: string; plus: string };

// Los montos se editan como dígitos ("15000") y se muestran con separador de
// miles ("15.000").
function soloDigitos(valor: string) {
  return valor.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
}

function formatDigitos(valor: string) {
  return valor ? Number(valor).toLocaleString("es-AR") : "";
}

function MontoInput({
  value,
  onChange,
  placeholder = "0",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
        $
      </span>
      <Input
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        aria-label={ariaLabel}
        value={formatDigitos(value)}
        onChange={(e) => onChange(soloDigitos(e.target.value))}
        className="pl-7 tabular-nums"
      />
    </div>
  );
}

export function MiPerfilSettings({
  initialFotoPerfilBase64,
  initialModeracionFoto,
  initialTituloCortesia,
  initialNombre,
  initialApellido,
  initialEspecialidad,
  initialNroMatricula,
  initialMontoConsultaParticular,
  prepagas,
  initialPrepagaIds,
  initialArancelesCobertura,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fotoPerfilBase64, setFotoPerfilBase64] = useState(initialFotoPerfilBase64);
  const [fotoSaving, setFotoSaving] = useState(false);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const [moderacionFoto, setModeracionFoto] = useState(initialModeracionFoto);

  const [tituloCortesia, setTituloCortesia] = useState<TituloCortesia | "">(
    initialTituloCortesia ?? ""
  );
  const [nombre, setNombre] = useState(initialNombre);
  const [apellido, setApellido] = useState(initialApellido);
  // La especialidad se define al registrarse y no se cambia desde el perfil.
  const especialidadLabel =
    ESPECIALIDAD_OPTIONS.find((o) => o.value === initialEspecialidad)?.label ?? "Sin especialidad";
  const [nroMatricula, setNroMatricula] = useState(initialNroMatricula);

  // Monto de la consulta particular: se guarda solo con dígitos ("15000") y se
  // muestra con separador de miles ("15.000").
  const [montoConsulta, setMontoConsulta] = useState(
    initialMontoConsultaParticular != null ? String(initialMontoConsultaParticular) : ""
  );

  // Coberturas con las que trabaja -- se guardan con "Guardar cambios".
  const [prepagaIds, setPrepagaIds] = useState<string[]>(initialPrepagaIds);
  const [prepagaBusqueda, setPrepagaBusqueda] = useState("");
  const [aranceles, setAranceles] = useState<Record<string, ArancelEditable>>(() =>
    Object.fromEntries(
      initialArancelesCobertura.map((a) => [
        a.prepagaId,
        {
          consulta: a.montoConsulta != null ? String(a.montoConsulta) : "",
          plus: a.montoPlus != null ? String(a.montoPlus) : "",
        },
      ])
    )
  );
  function setArancel(prepagaId: string, campo: keyof ArancelEditable, valor: string) {
    setAranceles((prev) => ({
      ...prev,
      [prepagaId]: { ...(prev[prepagaId] ?? { consulta: "", plus: "" }), [campo]: valor },
    }));
  }
  // Solo los de coberturas elegidas, en orden estable (para comparar cambios).
  const arancelesElegidos = [...prepagaIds].sort().map((prepagaId) => ({
    prepagaId,
    consulta: aranceles[prepagaId]?.consulta ?? "",
    plus: aranceles[prepagaId]?.plus ?? "",
  }));
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
    nroMatricula,
    montoConsulta,
    prepagaIds: [...prepagaIds].sort(),
    arancelesElegidos,
  });
  const [perfilGuardado, setPerfilGuardado] = useState(perfilSnapshot);
  const hayCambios = perfilSnapshot !== perfilGuardado;

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
      // El servidor la re-codifica (ver `src/lib/imagen-perfil.ts`): se muestra
      // la versión guardada, no la original.
      setFotoPerfilBase64(data.fotoPerfil ?? dataUrl);
      setModeracionFoto(estadoAviso(data.moderacion));
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
      setModeracionFoto(null);
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

    if (!tituloCortesia || !nombre.trim() || !apellido.trim() || !nroMatricula.trim()) {
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
          nroMatricula,
          prepagaIds,
          montoConsultaParticular: montoConsulta ? Number(montoConsulta) : null,
          aranceles: arancelesElegidos.map((a) => ({
            prepagaId: a.prepagaId,
            montoConsulta: a.consulta ? Number(a.consulta) : null,
            montoPlus: a.plus ? Number(a.plus) : null,
          })),
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
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
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
        <AvisoModeracion campo="foto" estado={moderacionFoto} />

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
            <Label htmlFor="perfil-especialidad">Especialidad</Label>
            <Input
              id="perfil-especialidad"
              value={especialidadLabel}
              readOnly
              tabIndex={-1}
              className="cursor-default bg-muted/60 text-muted-foreground focus-visible:ring-0"
            />
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
          <div className="flex flex-col gap-2">
            <div className="hidden grid-cols-[minmax(0,1fr)_9rem_9rem_2rem] gap-3 px-3 text-xs font-medium text-muted-foreground sm:grid">
              <span>Cobertura</span>
              <span>Paga por consulta</span>
              <span>Plus (opcional)</span>
              <span />
            </div>
            <ul
              className="flex flex-col divide-y divide-border rounded-lg border border-border"
              aria-label="Coberturas elegidas"
            >
              {prepagasElegidas.map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_2rem]"
                >
                  <span
                    className="col-start-1 row-start-1 min-w-0 truncate text-sm font-semibold"
                    title={p.nombreCompleto ?? p.nombre}
                  >
                    {p.nombre}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar ${p.nombre}`}
                    onClick={() => setPrepagaIds((prev) => prev.filter((id) => id !== p.id))}
                    className="col-start-2 row-start-1 text-muted-foreground sm:col-start-4"
                  >
                    <X className="size-4" />
                  </Button>
                  <div className="col-span-2 grid grid-cols-2 gap-3 sm:col-span-2 sm:col-start-2 sm:row-start-1">
                    <MontoInput
                      value={aranceles[p.id]?.consulta ?? ""}
                      onChange={(v) => setArancel(p.id, "consulta", v)}
                      ariaLabel={`Lo que paga ${p.nombre} por consulta`}
                    />
                    <MontoInput
                      value={aranceles[p.id]?.plus ?? ""}
                      onChange={(v) => setArancel(p.id, "plus", v)}
                      placeholder="Sin plus"
                      ariaLabel={`Plus que cobrás a pacientes de ${p.nombre}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {prepagasElegidas.length === 1 ? "1 cobertura" : `${prepagasElegidas.length} coberturas`}. Los
              montos son opcionales: se usan para tu reporte de ingresos y nunca se publican.
            </p>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Consulta particular" icon={Banknote}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="perfil-monto-consulta">Monto de la consulta particular</Label>
          <div className="relative sm:max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="perfil-monto-consulta"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={formatDigitos(montoConsulta)}
              onChange={(e) => setMontoConsulta(soloDigitos(e.target.value))}
              className="pl-7 tabular-nums"
              aria-describedby="perfil-monto-consulta-ayuda"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Lo que cobrás a pacientes sin cobertura. Podés dejarlo vacío.
          </span>
        </div>
        <div
          id="perfil-monto-consulta-ayuda"
          className="flex gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
        >
          <Info className="mt-px size-3.5 shrink-0" />
          <p>
            Cargar este monto no lo publica en tu perfil: para mostrarlo a tus pacientes, prendelo
            en Información pública. También se usa en tu reporte de ingresos.
          </p>
        </div>
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

    </div>
  );
}
