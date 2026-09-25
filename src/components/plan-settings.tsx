"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsSection } from "@/components/settings-section";
import {
  PLAN_DURACION_LABEL,
  PLAN_FEATURES,
  precioMensualEquivalente,
  type PlanDuracion,
} from "@/lib/plan";
import { TIME_ZONE } from "@/lib/timezone";

type Props = {
  plan: "BASICA" | "PREMIUM";
  trialEndsAt: string | null;
  diasRestantesDeTrial: number | null;
  planDuracion: PlanDuracion | null;
  planEndsAt: string | null;
  mpPreapprovalStatus: "PENDING" | "AUTHORIZED" | "PAUSED" | "CANCELLED" | null;
  pagoEnGracia: boolean;
  graciaVenceEl: string | null;
};

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: TIME_ZONE });
}

export function PlanSettings({
  plan,
  trialEndsAt,
  diasRestantesDeTrial,
  planDuracion,
  planEndsAt,
  mpPreapprovalStatus,
  pagoEnGracia,
  graciaVenceEl,
}: Props) {
  const [duracion, setDuracion] = useState<PlanDuracion>(planDuracion ?? "MENSUAL");
  const [cargando, setCargando] = useState<"BASICA" | "PREMIUM" | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enTrial = diasRestantesDeTrial !== null && diasRestantesDeTrial > 0;
  const suscripcionActiva = mpPreapprovalStatus === "AUTHORIZED";

  async function suscribirse(planElegido: "BASICA" | "PREMIUM") {
    setError(null);
    setCargando(planElegido);

    let response: Response;
    try {
      response = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planElegido, duracion }),
      });
    } catch {
      // El fetch en sí no llegó a completarse -- caída de red real, no un
      // error de negocio que el servidor haya alcanzado a responder.
      setError("No se pudo conectar con el servidor.");
      setCargando(null);
      return;
    }

    let data: { initPoint?: string; error?: string };
    try {
      data = await response.json();
    } catch {
      // El servidor respondió, pero el cuerpo no es JSON válido (p.ej. un
      // proxy/túnel cortó la respuesta a mitad de camino) -- distinto de
      // "no se pudo conectar", conviene decirlo así para no confundir.
      setError(`El servidor respondió de forma inesperada (${response.status}). Probá de nuevo.`);
      setCargando(null);
      return;
    }

    if (!response.ok || !data.initPoint) {
      setError(data.error ?? "No se pudo iniciar la suscripción.");
      setCargando(null);
      return;
    }
    window.location.href = data.initPoint;
  }

  async function cancelarSuscripcion() {
    setError(null);
    setCancelando(true);
    try {
      const response = await fetch("/api/mercadopago/cancelar", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo cancelar la suscripción.");
        setCancelando(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("No se pudo conectar con el servidor.");
      setCancelando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {pagoEnGracia && graciaVenceEl && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Tu último pago no se pudo procesar. Tenés hasta el{" "}
              <strong>{formatFecha(graciaVenceEl)}</strong> para regularizarlo antes de perder el
              acceso.
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={cargando !== null}
            onClick={() => suscribirse(plan)}
            className="shrink-0 border-amber-400 bg-transparent text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
          >
            {cargando === plan ? <Loader2 className="size-4 animate-spin" /> : "Reintentar pago"}
          </Button>
        </div>
      )}

      {mpPreapprovalStatus === "PENDING" && !pagoEnGracia && (
        <p className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
          Estamos confirmando tu suscripción con MercadoPago. Si ya completaste el pago, esto se
          actualiza solo en unos segundos.
        </p>
      )}

      <SettingsSection
        title="Tu plan actual"
        description="Podés cambiar de plan o de duración cuando quieras."
        icon={Sparkles}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={plan === "PREMIUM" ? "default" : "secondary"} className="text-sm">
            {plan === "PREMIUM" ? "Premium" : "Básico"}
          </Badge>
          {enTrial && (
            <span className="text-sm text-muted-foreground">
              Período de prueba: quedan {diasRestantesDeTrial}{" "}
              {diasRestantesDeTrial === 1 ? "día" : "días"}
              {trialEndsAt && ` (hasta el ${formatFecha(trialEndsAt)})`}.
            </span>
          )}
          {suscripcionActiva && planEndsAt && (
            <span className="text-sm text-muted-foreground">
              {planDuracion && `${PLAN_DURACION_LABEL[planDuracion]} · `}
              se renueva el {formatFecha(planEndsAt)}.
            </span>
          )}
          {suscripcionActiva && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={cancelando}
              onClick={cancelarSuscripcion}
              className="text-muted-foreground hover:text-destructive"
            >
              {cancelando ? <Loader2 className="size-4 animate-spin" /> : "Cancelar suscripción"}
            </Button>
          )}
        </div>
      </SettingsSection>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Duración:</span>
        <Select value={duracion} onValueChange={(v) => setDuracion(v as PlanDuracion)}>
          <SelectTrigger className="w-40 bg-card">
            <SelectValue>{(v: PlanDuracion) => PLAN_DURACION_LABEL[v]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PLAN_DURACION_LABEL) as PlanDuracion[]).map((d) => (
              <SelectItem key={d} value={d}>
                {PLAN_DURACION_LABEL[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          (se factura mes a mes en MercadoPago, al precio con descuento de la duración elegida)
        </span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Básico</h3>
          <p className="text-sm text-muted-foreground">
            ${precioMensualEquivalente("BASICA", duracion).toLocaleString("es-AR")}/mes
          </p>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {PLAN_FEATURES.BASICA.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
          {!(plan === "BASICA" && suscripcionActiva) && (
            <Button
              type="button"
              variant="outline"
              className="mt-1 self-start"
              disabled={cargando !== null}
              onClick={() => suscribirse("BASICA")}
            >
              {cargando === "BASICA" ? <Loader2 className="size-4 animate-spin" /> : "Suscribirme"}
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 sm:p-5">
          <h3 className="text-sm font-semibold">Premium</h3>
          <p className="text-sm text-muted-foreground">
            ${precioMensualEquivalente("PREMIUM", duracion).toLocaleString("es-AR")}/mes
          </p>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {PLAN_FEATURES.PREMIUM.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
          {!(plan === "PREMIUM" && suscripcionActiva) && (
            <Button
              type="button"
              className="mt-1 self-start"
              disabled={cargando !== null}
              onClick={() => suscribirse("PREMIUM")}
            >
              {cargando === "PREMIUM" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Pasar a Premium"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
