"use client";

import { useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings-section";
import {
  PLAN_DURACION_LABEL,
  PLAN_FEATURES,
  PLAN_PRICING,
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
  // Mientras se confirma un pago recién iniciado, no tiene sentido dejar
  // arrancar OTRA suscripción en paralelo -- se espera a que el webhook
  // resuelva esta primero (ver el aviso de "Estamos confirmando...").
  const pendienteDeConfirmacion = mpPreapprovalStatus === "PENDING" && !pagoEnGracia;
  // Tabla comparativa: todo lo de Básico (incluido también en Premium) más
  // lo que suma Premium -- el primer item de PLAN_FEATURES.PREMIUM ("Todo
  // lo de Básico") es solo una frase resumen, no una fila propia.
  const filasComparacion = [
    ...PLAN_FEATURES.BASICA.map((label) => ({ label, basica: true })),
    ...PLAN_FEATURES.PREMIUM.slice(1).map((label) => ({ label, basica: false })),
  ];

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
        </div>
      </SettingsSection>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PLAN_DURACION_LABEL) as PlanDuracion[]).map((d) => {
            const descuento = Math.round(
              (1 - PLAN_PRICING.BASICA[d] / PLAN_PRICING.BASICA.MENSUAL) * 100
            );
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDuracion(d)}
                className={
                  d === duracion
                    ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    : "rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
                }
              >
                {PLAN_DURACION_LABEL[d]}
                {descuento > 0 && ` -${descuento}%`}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          Se factura mes a mes en MercadoPago, al precio con descuento de la duración elegida.
        </span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
        <div className="relative min-w-[520px] p-5 sm:p-6">
          <div className="pointer-events-none absolute top-5 right-5 bottom-5 w-28 rounded-xl bg-primary/5 sm:top-6 sm:right-6 sm:bottom-6" />

          <div className="relative grid grid-cols-[1fr_7rem_7rem] items-end gap-x-2 border-b-2 border-border/40 pb-4">
            <div />
            <div className="text-center">
              <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                Básico
              </div>
              <div className="mt-1 text-xl font-extrabold">
                ${precioMensualEquivalente("BASICA", duracion).toLocaleString("es-AR")}
              </div>
              <div className="text-[11px] text-muted-foreground">por mes</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold tracking-wide text-primary uppercase">Premium</div>
              <div className="mt-1 text-xl font-extrabold">
                ${precioMensualEquivalente("PREMIUM", duracion).toLocaleString("es-AR")}
              </div>
              <div className="text-[11px] text-muted-foreground">por mes</div>
            </div>
          </div>

          {filasComparacion.map((fila) => (
            <div
              key={fila.label}
              className="relative grid grid-cols-[1fr_7rem_7rem] items-center gap-x-2 border-b border-border/30 py-3 last:border-0"
            >
              <div className="text-sm text-foreground/80">{fila.label}</div>
              <div className="flex justify-center">
                {fila.basica ? (
                  <Check className="size-4 text-primary" />
                ) : (
                  <X className="size-4 text-muted-foreground/25" />
                )}
              </div>
              <div className="flex justify-center">
                <Check className="size-4 text-primary" />
              </div>
            </div>
          ))}

          <div className="relative grid grid-cols-[1fr_7rem_7rem] items-center gap-x-2 pt-5">
            <div />
            <div className="flex justify-center">
              {enTrial ? (
                <span className="text-center text-[11px] text-muted-foreground">
                  Incluido en tu prueba
                </span>
              ) : (
                !(plan === "BASICA" && suscripcionActiva) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={cargando !== null || pendienteDeConfirmacion}
                    onClick={() => suscribirse("BASICA")}
                  >
                    {cargando === "BASICA" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Suscribirme"
                    )}
                  </Button>
                )
              )}
            </div>
            <div className="flex justify-center">
              {!(plan === "PREMIUM" && suscripcionActiva) && (
                <Button
                  type="button"
                  size="sm"
                  disabled={cargando !== null || pendienteDeConfirmacion}
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
      </div>

      {suscripcionActiva && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={cancelando}
          onClick={cancelarSuscripcion}
          className="self-start text-muted-foreground hover:border-destructive/40 hover:text-destructive"
        >
          {cancelando ? <Loader2 className="size-4 animate-spin" /> : "Cancelar suscripción"}
        </Button>
      )}
    </div>
  );
}
