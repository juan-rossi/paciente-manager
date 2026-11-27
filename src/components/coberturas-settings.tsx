"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Info, ShieldCheck, X } from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxContent,
  ComboboxItem,
} from "@/components/ui/combobox";

type Prepaga = { id: string; nombre: string; nombreCompleto: string | null };

type Props = {
  // Catálogo completo y las coberturas que ya eligió el médico.
  prepagas: Prepaga[];
  initialElegidas: { prepagaId: string; aceptaTeleconsulta: boolean }[];
  initialMontoConsultaParticular: number | null;
  // Solo con la teleconsulta activa tiene sentido elegir cuáles la cubren.
  mostrarTeleconsulta: boolean;
};

export function CoberturasSettings({
  prepagas,
  initialElegidas,
  initialMontoConsultaParticular,
  mostrarTeleconsulta,
}: Props) {
  const router = useRouter();

  // prepagaId -> acepta teleconsulta. Se guarda con "Guardar cambios".
  const [elegidas, setElegidas] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialElegidas.map((e) => [e.prepagaId, e.aceptaTeleconsulta]))
  );
  const [busqueda, setBusqueda] = useState("");

  // Monto de la consulta particular: se guarda solo con dígitos ("15000") y se
  // muestra con separador de miles ("15.000").
  const [montoConsulta, setMontoConsulta] = useState(
    initialMontoConsultaParticular != null ? String(initialMontoConsultaParticular) : ""
  );
  const montoConsultaFormateado = montoConsulta ? Number(montoConsulta).toLocaleString("es-AR") : "";

  const opciones = prepagas
    .filter((p) => !(p.id in elegidas))
    .map((p) => ({
      value: p.id,
      label: p.nombreCompleto && p.nombreCompleto !== p.nombre ? `${p.nombre} (${p.nombreCompleto})` : p.nombre,
    }));
  const lista = prepagas
    .filter((p) => p.id in elegidas)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const cantidadTeleconsulta = lista.filter((p) => elegidas[p.id]).length;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const snapshot = JSON.stringify({
    montoConsulta,
    elegidas: Object.entries(elegidas).sort(([a], [b]) => a.localeCompare(b)),
  });
  const [guardado, setGuardado] = useState(snapshot);
  const hayCambios = snapshot !== guardado;

  function quitar(id: string) {
    setElegidas((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleGuardar() {
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/coberturas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prepagas: Object.entries(elegidas).map(([id, aceptaTeleconsulta]) => ({ id, aceptaTeleconsulta })),
          montoConsultaParticular: montoConsulta ? Number(montoConsulta) : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const issue = data.issues?.fieldErrors?.montoConsultaParticular?.[0];
        setError(issue ?? data.error ?? "No se pudieron guardar las coberturas.");
        return;
      }
      setGuardado(snapshot);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <SettingsSection
        title="Prepagas y obras sociales"
        icon={ShieldCheck}
        description="Las que aceptás. Tus pacientes las ven en tu perfil público y las eligen al reservar un turno."
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coberturas-buscar">Agregar cobertura</Label>
          <Combobox
            items={opciones}
            value={null}
            inputValue={busqueda}
            onInputValueChange={setBusqueda}
            onValueChange={(item) => {
              const id = (item as { value: string } | null)?.value;
              // Teleconsulta arranca apagada: el médico la prende solo si esa cobertura la cubre.
              if (id) setElegidas((prev) => ({ ...prev, [id]: false }));
              setBusqueda("");
            }}
          >
            <ComboboxInputGroup>
              <ComboboxInput id="coberturas-buscar" placeholder="Buscar cobertura..." />
              <ComboboxTrigger aria-label="Abrir coberturas" />
            </ComboboxInputGroup>
            <ComboboxContent>
              {(option: (typeof opciones)[number]) => (
                <ComboboxItem key={option.value} value={option}>
                  {option.label}
                </ComboboxItem>
              )}
            </ComboboxContent>
          </Combobox>
        </div>

        {lista.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground">
            Todavía no cargaste ninguna. Buscá arriba para empezar.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_2rem] items-center gap-3 bg-muted/40 px-3 py-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase sm:px-4">
              <span>Cobertura</span>
              {mostrarTeleconsulta ? <span className="w-24 text-center">Teleconsulta</span> : <span />}
              <span />
            </div>
            <ul aria-label="Coberturas elegidas">
              {lista.map((p) => (
                <li
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_2rem] items-center gap-3 border-t border-border/60 px-3 py-2.5 sm:px-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{p.nombre}</p>
                    {p.nombreCompleto && p.nombreCompleto !== p.nombre && (
                      <p className="truncate text-xs text-muted-foreground" title={p.nombreCompleto}>
                        {p.nombreCompleto}
                      </p>
                    )}
                  </div>
                  {mostrarTeleconsulta ? (
                    <div className="flex w-24 justify-center">
                      <Switch
                        checked={elegidas[p.id]}
                        onCheckedChange={(checked) => setElegidas((prev) => ({ ...prev, [p.id]: checked }))}
                        aria-label={`Aceptar ${p.nombre} por teleconsulta`}
                      />
                    </div>
                  ) : (
                    <span />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Quitar ${p.nombre}`}
                    onClick={() => quitar(p.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {lista.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {lista.length === 1 ? "1 cobertura" : `${lista.length} coberturas`}
            {mostrarTeleconsulta &&
              ` · ${cantidadTeleconsulta === lista.length ? "todas" : cantidadTeleconsulta} también por teleconsulta`}
          </p>
        )}
        {mostrarTeleconsulta && lista.length > 0 && (
          <div className="flex gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-px size-3.5 shrink-0" />
            <p>
              Al reservar un turno por videollamada, tus pacientes solo ven las coberturas que
              aceptás por teleconsulta. El resto puede reservarlo como particular.
            </p>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Consulta particular" icon={Banknote}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="coberturas-monto-consulta">Monto de la consulta particular</Label>
          <div className="relative sm:max-w-xs">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="coberturas-monto-consulta"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={montoConsultaFormateado}
              onChange={(e) =>
                setMontoConsulta(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))
              }
              className="pl-7 tabular-nums"
              aria-describedby="coberturas-monto-consulta-ayuda"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Lo que cobrás a pacientes sin cobertura. Podés dejarlo vacío.
          </span>
        </div>
        <div
          id="coberturas-monto-consulta-ayuda"
          className="flex gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground"
        >
          <Info className="mt-px size-3.5 shrink-0" />
          <p>
            Cargar este monto no lo publica en tu perfil: para mostrarlo a tus pacientes, prendelo en
            Información pública. Además, nos sirve como referencia para los reportes financieros que sumemos más
            adelante.
          </p>
        </div>
      </SettingsSection>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={handleGuardar} disabled={saving || !hayCambios}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
