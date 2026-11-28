"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Loader2,
  Lock,
  Plus,
  Repeat,
  TriangleAlert,
  Video,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { SettingsSection } from "@/components/settings-section";
import { irAConfiguracionTab, irAMiPracticaConLugar } from "@/lib/configuracion-tabs";
import type { TeleconsultaConfigGuardada } from "@/lib/teleconsulta-config";
import {
  type CobroTeleconsulta,
  type MomentoCobro,
} from "@/lib/teleconsulta-cobro";
import { cn } from "@/lib/utils";

type Props = {
  initialConfig: TeleconsultaConfigGuardada;
  // Hay un lugar VIRTUAL en Mi práctica: mientras exista no se puede apagar
  // la teleconsulta ni la opción del lugar (ver `validarConfigTeleconsulta`).
  initialTieneLugarVirtual: boolean;
  // Función Premium (ver `planPermiteTeleconsulta`): sin el plan la sección
  // se ve bloqueada y apagada, con el acceso a Mi plan.
  incluidaEnPlan: boolean;
  initialCobro: CobroTeleconsulta;
  // El de Coberturas, para la opción "Igual a la consulta particular".
  montoConsultaParticular: number | null;
  // Configuración > Coberturas: cuántas cargó y cuántas acepta por
  // teleconsulta (arrancan apagadas, así que hay que avisar dónde se eligen).
  coberturas: { total: number; conTeleconsulta: number };
};

const OPCIONES_COBRO: { value: MomentoCobro; label: string; descripcion: string }[] = [
  { value: "ANTES", label: "Por adelantado", descripcion: "El paciente paga antes del turno." },
  {
    value: "DESPUES",
    label: "Después de la consulta",
    descripcion: "El paciente paga al terminar la videollamada.",
  },
];

// Configuración > Teleconsulta. Cada cambio se guarda al toque (como un
// interruptor), así el botón "Crear lugar de Teleconsulta" siempre refleja
// lo que el servidor ya tiene guardado.
export function TeleconsultaSettings({
  initialConfig,
  initialTieneLugarVirtual,
  incluidaEnPlan,
  initialCobro,
  montoConsultaParticular,
  coberturas,
}: Props) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [tieneLugarVirtual, setTieneLugarVirtual] = useState(initialTieneLugarVirtual);
  const [saving, setSaving] = useState(false);
  const [creandoLugar, setCreandoLugar] = useState(false);
  // El refresh que trae el lugar nuevo a Mi práctica: hasta que termine no se
  // muestra "Ir a Mi práctica" -- si no, la tab se monta con la lista vieja
  // (la guarda en su estado) y el lugar recién aparece al recargar la página.
  const [refrescandoLugar, startRefrescoLugar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Diálogo que explica por qué no se puede apagar mientras exista el lugar
  // VIRTUAL (antes el control quedaba deshabilitado y el click no hacía nada).
  const [avisoLugarAbierto, setAvisoLugarAbierto] = useState(false);

  // Cobro: el momento se guarda al toque (como el resto de las opciones); el
  // alias, que es texto, con su botón.
  const [cobro, setCobro] = useState(initialCobro);
  const [alias, setAlias] = useState(initialCobro.aliasCobro ?? "");
  // Qué campos del cobro se están guardando: cada control se bloquea solo
  // mientras se guarda lo suyo (bloquear todo hacía parpadear los campos de
  // abajo al cambiar el momento del cobro).
  const [guardandoCampos, setGuardandoCampos] = useState<Set<keyof CobroTeleconsulta>>(
    () => new Set()
  );
  const guardando = (...campos: (keyof CobroTeleconsulta)[]) =>
    campos.some((c) => guardandoCampos.has(c));
  const [aliasGuardado, setAliasGuardado] = useState(false);
  const [errorCobro, setErrorCobro] = useState<string | null>(null);
  const aliasCambiado = alias.trim() !== (cobro.aliasCobro ?? "");
  // Monto propio de la teleconsulta: solo dígitos ("15000"), se muestra con
  // separador de miles (igual que el de la consulta particular en Coberturas).
  const [monto, setMonto] = useState(
    initialCobro.montoTeleconsulta != null ? String(initialCobro.montoTeleconsulta) : ""
  );
  const [montoGuardado, setMontoGuardado] = useState(false);
  const montoNumero = monto ? Number(monto) : null;
  const montoCambiado = montoNumero !== cobro.montoTeleconsulta;

  // Sin Premium se muestra apagada aunque haya quedado guardada prendida.
  const habilitada = incluidaEnPlan && config.teleconsultaHabilitada;

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
      startRefrescoLugar(() => {
        setTieneLugarVirtual(true);
        router.refresh();
      });
    } catch {
      setError("No se pudo conectar para crear el lugar de Teleconsulta.");
    } finally {
      setCreandoLugar(false);
    }
  }

  async function guardarCobro(cambios: Partial<CobroTeleconsulta>) {
    const campos = Object.keys(cambios) as (keyof CobroTeleconsulta)[];
    // Al terminar se tocan solo los campos de este guardado, para no pisar
    // otro guardado que siga en curso.
    const aplicar = (origen: CobroTeleconsulta) =>
      setCobro((actual) => ({
        ...actual,
        ...Object.fromEntries(campos.map((c) => [c, origen[c]])),
      }));
    const anterior = cobro;
    const nuevo = { ...cobro, ...cambios };
    setCobro(nuevo);
    setGuardandoCampos((s) => new Set([...s, ...campos]));
    setAliasGuardado(false);
    setMontoGuardado(false);
    setErrorCobro(null);
    try {
      const response = await fetch("/api/teleconsulta/cobro", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevo),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        aplicar(anterior);
        setErrorCobro(data?.error ?? "No se pudo guardar el cobro.");
        return;
      }
      aplicar(data);
      if ("aliasCobro" in cambios) {
        // El servidor lo normaliza (p.ej. saca los espacios de un CBU).
        setAlias(data.aliasCobro ?? "");
        setAliasGuardado(true);
      }
      if ("montoTeleconsulta" in cambios) {
        setMonto(data.montoTeleconsulta != null ? String(data.montoTeleconsulta) : "");
        setMontoGuardado(true);
      }
    } catch {
      aplicar(anterior);
      setErrorCobro("No se pudo conectar para guardar el cobro.");
    } finally {
      setGuardandoCampos((s) => {
        const resto = new Set(s);
        campos.forEach((c) => resto.delete(c));
        return resto;
      });
    }
  }

  const bloqueadoPorLugar = tieneLugarVirtual;
  const avisoBloqueo = "Para desactivarlo, eliminá primero el lugar de Teleconsulta en Mi práctica.";

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Teleconsulta"
        description="Atendé pacientes por videollamada desde Semio360. El paciente entra a la sala con el link que le llega en el recordatorio, sin instalar nada."
        icon={Video}
      >
        {!incluidaEnPlan && (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Lock className="size-3.5 shrink-0" />
              La teleconsulta es parte del plan Premium.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start sm:self-auto"
              onClick={() => irAConfiguracionTab("plan")}
            >
              Ver Mi plan
            </Button>
          </div>
        )}

        <div className={cn("flex items-start gap-3", !incluidaEnPlan && "opacity-60")}>
          <Switch
            id="teleconsulta-habilitada"
            className="mt-0.5"
            checked={habilitada}
            onCheckedChange={(checked) => {
              if (!checked && bloqueadoPorLugar) {
                setAvisoLugarAbierto(true);
                return;
              }
              guardar({ teleconsultaHabilitada: checked });
            }}
            disabled={!incluidaEnPlan || saving}
          />
          <div className="flex flex-col gap-0.5">
            <Label htmlFor="teleconsulta-habilitada" className="font-medium">
              Atender por teleconsulta
            </Label>
            <p className="text-xs text-muted-foreground">
              {!incluidaEnPlan
                ? "Atendé por videollamada y pasá turnos presenciales a teleconsulta."
                : habilitada && bloqueadoPorLugar
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
              checked={habilitada && config.teleconsultaPasarPresenciales}
              onCheckedChange={(checked) => guardar({ teleconsultaPasarPresenciales: checked === true })}
              disabled={!habilitada || saving}
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="teleconsulta-pasar-presenciales" className="flex items-center gap-1.5 font-normal">
                <Repeat className="size-3.5 text-muted-foreground" />
                Pasar turnos presenciales a teleconsulta
              </Label>
              <p className="text-xs text-muted-foreground">
                Desde el turno en la agenda, sin moverlo de lugar ni de horario. Al activarlo queda
                habilitado en todos tus lugares; podés sacarlo de alguno desde Mi práctica, al editar
                el lugar. Si lo desactivás, los turnos que ya pasaste
                siguen siendo por videollamada y los podés volver a presencial.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="teleconsulta-lugar-virtual"
                className="mt-0.5"
                checked={habilitada && config.teleconsultaLugarVirtual}
                onCheckedChange={(checked) => {
                  if (checked !== true && bloqueadoPorLugar) {
                    setAvisoLugarAbierto(true);
                    return;
                  }
                  guardar({ teleconsultaLugarVirtual: checked === true });
                }}
                disabled={!habilitada || saving}
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

            {habilitada && config.teleconsultaLugarVirtual && !tieneLugarVirtual && (
              <div className="ml-6.5 flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="text-muted-foreground">Todavía no creaste el lugar de Teleconsulta.</span>
                <Button
                  type="button"
                  size="sm"
                  className="self-start sm:self-auto"
                  onClick={crearLugarVirtual}
                  disabled={creandoLugar || refrescandoLugar || saving}
                >
                  {creandoLugar || refrescandoLugar ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Crear lugar de Teleconsulta
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className={cn("border-t border-border/60 pt-4", !habilitada && "opacity-50")}>
          <EstadoCoberturas
            total={coberturas.total}
            conTeleconsulta={coberturas.conTeleconsulta}
            disabled={!habilitada}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </SettingsSection>

      <SettingsSection
        title="Cobro de la teleconsulta"
        description={
          <>
            Cuándo y cuánto le cobrás al paciente, y a dónde te transfiere. Se usa en los recordatorios con las
            variables {"{pago}"} y {"{alias}"}.{" "}
            <button
              type="button"
              onClick={() => irAConfiguracionTab("mensajeria")}
              className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
            >
              Ir a Mensajería
              <ArrowRight className="size-3" />
            </button>
          </>
        }
        icon={Wallet}
      >
        <div className={cn("flex flex-col gap-5", !habilitada && "opacity-50")}>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">¿Cuándo se cobra?</span>
            <RadioGroup
              value={cobro.teleconsultaCobro}
              onValueChange={(v) => guardarCobro({ teleconsultaCobro: v as MomentoCobro })}
              disabled={!habilitada || guardando("teleconsultaCobro")}
              className="grid gap-2 sm:grid-cols-2"
            >
              {OPCIONES_COBRO.map((o) => (
                <label
                  key={o.value}
                  htmlFor={`teleconsulta-cobro-${o.value}`}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-lg border bg-background p-3 transition-colors",
                    "hover:border-primary/40 hover:bg-muted/40",
                    "has-[[data-checked]]:border-primary has-[[data-checked]]:bg-primary/5",
                    "has-[[data-disabled]]:cursor-not-allowed has-[[data-disabled]]:hover:border-border has-[[data-disabled]]:hover:bg-background"
                  )}
                >
                  <RadioGroupItem
                    value={o.value}
                    id={`teleconsulta-cobro-${o.value}`}
                    className="mt-0.5"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{o.label}</span>
                    <span className="text-xs text-muted-foreground">{o.descripcion}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3 border-t border-border/60 pt-4">
            <Label htmlFor="teleconsulta-monto" className="text-sm font-medium">
              Monto de la teleconsulta
            </Label>
            {/* El monto es un dato, no una elección: un solo campo, y el switch
                decide de dónde sale. Con el switch prendido muestra (bloqueado)
                el de la consulta particular de Coberturas. */}
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                guardarCobro({ montoTeleconsulta: montoNumero });
              }}
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:max-w-xs sm:flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="teleconsulta-monto"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder={
                      cobro.montoTeleconsultaUsaParticular && montoConsultaParticular == null
                        ? "Sin cargar"
                        : "0"
                    }
                    value={
                      cobro.montoTeleconsultaUsaParticular
                        ? (montoConsultaParticular?.toLocaleString("es-AR") ?? "")
                        : montoNumero != null
                          ? montoNumero.toLocaleString("es-AR")
                          : ""
                    }
                    onChange={(e) => {
                      setMonto(
                        e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9)
                      );
                      setMontoGuardado(false);
                    }}
                    disabled={
                      !habilitada ||
                      guardando("montoTeleconsulta", "montoTeleconsultaUsaParticular") ||
                      cobro.montoTeleconsultaUsaParticular
                    }
                    className="pl-7 tabular-nums"
                  />
                </div>
                {!cobro.montoTeleconsultaUsaParticular && (
                  <Button
                    type="submit"
                    variant="outline"
                    className="self-start"
                    disabled={!habilitada || guardando("montoTeleconsulta") || !montoCambiado}
                  >
                    {guardando("montoTeleconsulta") && <Loader2 className="size-4 animate-spin" />}
                    Guardar
                  </Button>
                )}
              </div>
              {!cobro.montoTeleconsultaUsaParticular && montoGuardado && !montoCambiado && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Check className="size-3.5 text-emerald-600" />
                  Guardado.
                </p>
              )}
            </form>

            <div className="flex items-start gap-2.5">
              <Switch
                id="teleconsulta-monto-particular"
                className="mt-0.5"
                checked={cobro.montoTeleconsultaUsaParticular}
                onCheckedChange={(checked) =>
                  guardarCobro({ montoTeleconsultaUsaParticular: checked })
                }
                disabled={!habilitada || guardando("montoTeleconsultaUsaParticular")}
              />
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="teleconsulta-monto-particular" className="text-sm font-normal">
                  Usar el monto de la consulta particular
                </Label>
                {montoConsultaParticular != null ? (
                  <span className="text-xs text-muted-foreground">El que cargaste en Coberturas.</span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Todavía no lo cargaste en Coberturas.{" "}
                    <button
                      type="button"
                      onClick={() => irAConfiguracionTab("coberturas", "coberturas-monto-consulta")}
                      className="inline-flex items-center gap-0.5 font-medium text-primary underline-offset-2 hover:underline"
                    >
                      Cargarlo
                      <ArrowRight className="size-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Se suma al texto de <strong>{"{pago}"}</strong> en los recordatorios. Si no hay monto
              cargado, el recordatorio no lo menciona.
            </p>
          </div>

          <form
            className="flex flex-col gap-2 border-t border-border/60 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              guardarCobro({ aliasCobro: alias.trim() || null });
            }}
          >
            <Label htmlFor="teleconsulta-alias" className="font-medium">
              Alias o CBU/CVU <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="teleconsulta-alias"
                value={alias}
                onChange={(e) => {
                  setAlias(e.target.value);
                  setAliasGuardado(false);
                }}
                placeholder="Ej.: consultorio.perez.mp"
                maxLength={60}
                autoComplete="off"
                spellCheck={false}
                disabled={!habilitada || guardando("aliasCobro")}
                className="sm:max-w-xs"
              />
              <Button
                type="submit"
                variant="outline"
                className="self-start"
                disabled={!habilitada || guardando("aliasCobro") || !aliasCambiado}
              >
                {guardando("aliasCobro") && <Loader2 className="size-4 animate-spin" />}
                Guardar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Se completa en los recordatorios donde pongas <strong>{"{alias}"}</strong>. Si lo dejás
              vacío, la variable queda en blanco.
            </p>
            {aliasGuardado && !aliasCambiado && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-3.5 text-emerald-600" />
                Guardado.
              </p>
            )}
          </form>

          {errorCobro && <p className="text-sm text-destructive">{errorCobro}</p>}
        </div>
      </SettingsSection>

      <Dialog open={avisoLugarAbierto} onOpenChange={setAvisoLugarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Primero eliminá el lugar de Teleconsulta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              Tenés un lugar de Teleconsulta en Mi práctica, con sus horarios y su reserva online.
              Mientras exista, la teleconsulta tiene que seguir activada.
            </p>
            <p>Eliminalo desde Mi práctica y después vas a poder desactivar esta opción.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAvisoLugarAbierto(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAvisoLugarAbierto(false);
                irAMiPracticaConLugar({ tipo: "VIRTUAL" });
              }}
            >
              Ir a Mi práctica
              <ArrowRight className="size-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Fila al pie de las opciones de Teleconsulta: las coberturas arrancan sin
// teleconsulta y se habilitan en Configuración > Coberturas. En ámbar cuando
// no hay ninguna habilitada (a los pacientes se les avisa que sería particular).
function EstadoCoberturas({
  total,
  conTeleconsulta,
  disabled,
}: {
  total: number;
  conTeleconsulta: number;
  disabled: boolean;
}) {
  const ninguna = total > 0 && conTeleconsulta === 0;
  const boton = (texto: string) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="self-start sm:self-auto"
      onClick={() => irAConfiguracionTab("coberturas")}
      disabled={disabled}
    >
      {texto}
      <ArrowRight className="size-4" />
    </Button>
  );

  if (ninguna) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        <span className="flex gap-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {total === 1
              ? "Tu cobertura no acepta teleconsulta."
              : `Ninguna de tus ${total} coberturas acepta teleconsulta.`}{" "}
            Al reservar por videollamada, tus pacientes solo van a poder elegir Particular.
          </span>
        </span>
        {boton("Elegir en Coberturas")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">
        {total === 0 ? (
          "Todavía no cargaste prepagas ni obras sociales."
        ) : (
          <>
            <strong className="font-semibold text-foreground tabular-nums">
              {conTeleconsulta} de {total}
            </strong>{" "}
            {total === 1 ? "cobertura" : "coberturas"} {conTeleconsulta === 1 ? "acepta" : "aceptan"}{" "}
            teleconsulta.
          </>
        )}
      </span>
      {boton(total === 0 ? "Cargar coberturas" : "Ir a Coberturas")}
    </div>
  );
}