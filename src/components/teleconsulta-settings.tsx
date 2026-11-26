"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, Loader2, Plus, Repeat, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SettingsSection } from "@/components/settings-section";
import { irAConfiguracionTab } from "@/lib/configuracion-tabs";
import type { TeleconsultaConfigGuardada } from "@/lib/teleconsulta-config";
import { cn } from "@/lib/utils";

type Props = {
  initialConfig: TeleconsultaConfigGuardada;
  // Hay un lugar VIRTUAL en Mi práctica: mientras exista no se puede apagar
  // la teleconsulta ni la opción del lugar (ver `validarConfigTeleconsulta`).
  initialTieneLugarVirtual: boolean;
};

// Configuración > Teleconsulta. Cada cambio se guarda al toque (como un
// interruptor), así el botón "Crear lugar de Teleconsulta" siempre refleja
// lo que el servidor ya tiene guardado.
export function TeleconsultaSettings({ initialConfig, initialTieneLugarVirtual }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [tieneLugarVirtual, setTieneLugarVirtual] = useState(initialTieneLugarVirtual);
  const [saving, setSaving] = useState(false);
  const [creandoLugar, setCreandoLugar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const habilitada = config.teleconsultaHabilitada;

  async function guardar(cambios: Partial<TeleconsultaConfigGuardada>) {
    const anterior = config;
    const nueva = { ...config, ...cambios };
    // Al prender sin ninguna opción marcada (p.ej. se apagó todo antes),
    // se vuelven a marcar las dos: prendida sin opciones no hace nada.
    if (
      cambios.teleconsultaHabilitada &&
      !nueva.teleconsultaPasarPresenciales &&
      !nueva.teleconsultaLugarVirtual
    ) {
      nueva.teleconsultaPasarPresenciales = true;
      nueva.teleconsultaLugarVirtual = true;
    }
    // Apagar el interruptor general desmarca las opciones (al volver a
    // prenderlo se marcan las dos, ver arriba).
    if (cambios.teleconsultaHabilitada === false) {
      nueva.teleconsultaPasarPresenciales = false;
      nueva.teleconsultaLugarVirtual = false;
    }
    // Y al revés: desmarcar la última opción apaga la teleconsulta entera.
    if (
      nueva.teleconsultaHabilitada &&
      !nueva.teleconsultaPasarPresenciales &&
      !nueva.teleconsultaLugarVirtual
    ) {
      nueva.teleconsultaHabilitada = false;
    }
    setConfig(nueva);
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/teleconsulta", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nueva),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setConfig(anterior);
        setError(data?.error ?? "No se pudo guardar la configuración.");
        return;
      }
      setConfig(data);
      // La agenda y Mi práctica leen esta configuración del servidor.
      router.refresh();
    } catch {
      setConfig(anterior);
      setError("No se pudo conectar para guardar la configuración.");
    } finally {
      setSaving(false);
    }
  }

  async function crearLugarVirtual() {
    setCreandoLugar(true);
    setError(null);
    try {
      const response = await fetch("/api/lugares-trabajo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "VIRTUAL" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "No se pudo crear el lugar de Teleconsulta.");
        return;
      }
      setTieneLugarVirtual(true);
      router.refresh();
    } catch {
      setError("No se pudo conectar para crear el lugar de Teleconsulta.");
    } finally {
      setCreandoLugar(false);
    }
  }

  const bloqueadoPorLugar = tieneLugarVirtual;
  const avisoBloqueo = "Para desactivarlo, eliminá primero el lugar de Teleconsulta en Mi práctica.";

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Teleconsulta"
        description="Atendé pacientes por videollamada desde Semio 360. El paciente entra a la sala con el link que le llega en el recordatorio, sin instalar nada."
        icon={Video}
      >
        <div className="flex items-start gap-3">
          <Switch
            id="teleconsulta-habilitada"
            className="mt-0.5"
            checked={habilitada}
            onCheckedChange={(checked) => guardar({ teleconsultaHabilitada: checked })}
            disabled={saving || (habilitada && bloqueadoPorLugar)}
          />
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="teleconsulta-habilitada" className="font-medium">
              Atender por teleconsulta
            </Label>
            <p className="text-xs text-muted-foreground">
              {habilitada && bloqueadoPorLugar
                ? avisoBloqueo
                : "Elegí abajo cómo querés usarla. Las asistentes siguen esta misma configuración."}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "flex flex-col gap-5 border-t border-border/60 pt-4 sm:pl-12",
            !habilitada && "opacity-50"
          )}
        >
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="teleconsulta-pasar-presenciales"
              className="mt-0.5"
              checked={config.teleconsultaPasarPresenciales}
              onCheckedChange={(checked) => guardar({ teleconsultaPasarPresenciales: checked === true })}
              disabled={!habilitada || saving}
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="teleconsulta-pasar-presenciales" className="flex items-center gap-1.5 font-normal">
                <Repeat className="size-3.5 text-muted-foreground" />
                Pasar turnos presenciales a teleconsulta
              </Label>
              <p className="text-xs text-muted-foreground">
                Desde el turno en la agenda, sin moverlo de lugar ni de horario. Elegí en qué lugares
                desde Mi práctica, al editar cada lugar. Si lo desactivás, los turnos que ya pasaste
                siguen siendo por videollamada y los podés volver a presencial.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="teleconsulta-lugar-virtual"
                className="mt-0.5"
                checked={config.teleconsultaLugarVirtual}
                onCheckedChange={(checked) => guardar({ teleconsultaLugarVirtual: checked === true })}
                disabled={
                  !habilitada || saving || (config.teleconsultaLugarVirtual && bloqueadoPorLugar)
                }
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="teleconsulta-lugar-virtual" className="flex items-center gap-1.5 font-normal">
                  <CalendarClock className="size-3.5 text-muted-foreground" />
                  Lugar de Teleconsulta
                </Label>
                <p className="text-xs text-muted-foreground">
                  Una agenda solo de videollamadas en Mi práctica, con sus propios horarios y reserva
                  online. Al reservar, el paciente acepta la atención por videollamada.
                </p>
              </div>
            </div>

            {habilitada && config.teleconsultaLugarVirtual && (
              <div className="ml-6.5 flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">
                  {tieneLugarVirtual
                    ? "Ya tenés el lugar de Teleconsulta. Sus horarios se cargan en Mi práctica."
                    : "Todavía no creaste el lugar de Teleconsulta."}
                </span>
                {tieneLugarVirtual ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start sm:self-auto"
                    onClick={() => irAConfiguracionTab("practica")}
                  >
                    Ir a Mi práctica
                    <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="self-start sm:self-auto"
                    onClick={crearLugarVirtual}
                    disabled={creandoLugar || saving}
                  >
                    {creandoLugar ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Crear lugar de Teleconsulta
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </SettingsSection>
    </div>
  );
}
