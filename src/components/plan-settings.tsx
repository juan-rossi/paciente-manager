"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Clock, Loader2, Sparkles, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Props = {
  plan: "BASICA" | "PREMIUM";
  trialEndsAt: string | null;
  diasRestantesDeTrial: number | null;
  planDuracion: PlanDuracion | null;
  planEndsAt: string | null;
  mpPreapprovalId: string | null;
  mpPreapprovalStatus: "PENDING" | "AUTHORIZED" | "PAUSED" | "CANCELLED" | null;
  pagoEnGracia: boolean;
  graciaVenceEl: string | null;
};

// Clave de localStorage bajo la que se recuerda el ID de la última preapproval
// "pendiente" que el médico cerró a mano -- así el aviso no vuelve a
// aparecer para ESE intento en particular, pero si arranca un checkout
// nuevo (mpPreapprovalId distinto, ver checkout/route.ts) sí se le vuelve a
// avisar.
const AVISO_PENDIENTE_CERRADO_KEY = "mp_aviso_pendiente_cerrado";

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: TIME_ZONE });
}

export function PlanSettings({
  plan,
  trialEndsAt,
  diasRestantesDeTrial,
  planDuracion,
  planEndsAt,
  mpPreapprovalId,
  mpPreapprovalStatus,
  pagoEnGracia,
  graciaVenceEl,
}: Props) {
  const [duracion, setDuracion] = useState<PlanDuracion>(planDuracion ?? "MENSUAL");
  const [mostrarTablaMobile, setMostrarTablaMobile] = useState(false);
  const [cargando, setCargando] = useState<"BASICA" | "PREMIUM" | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avisoPendienteCerrado, setAvisoPendienteCerrado] = useState(false);

  // Se lee en un efecto (no al inicializar el state) para no desalinear el
  // render del servidor con el del cliente en el primer paint.
  useEffect(() => {
    if (!mpPreapprovalId) return;
    try {
      if (localStorage.getItem(AVISO_PENDIENTE_CERRADO_KEY) === mpPreapprovalId) {
        setAvisoPendienteCerrado(true);
      }
    } catch {
      // Storage no disponible (modo privado, etc.) -- el aviso simplemente
      // se puede volver a mostrar, no es crítico.
    }
  }, [mpPreapprovalId]);

  function cerrarAvisoPendiente() {
    setAvisoPendienteCerrado(true);
    try {
      if (mpPreapprovalId) localStorage.setItem(AVISO_PENDIENTE_CERRADO_KEY, mpPreapprovalId);
    } catch {
      // Idem -- si no se puede persistir, el cierre solo dura esta vista.
    }
  }

  const enTrial = diasRestantesDeTrial !== null && diasRestantesDeTrial > 0;
  const suscripcionActiva = mpPreapprovalStatus === "AUTHORIZED";
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

  const tablaComparativa = (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
      <div className="relative min-w-[580px] p-5 sm:p-6">
        <div className="pointer-events-none absolute top-2.5 right-5 bottom-2.5 w-40 rounded-2xl bg-primary/5 sm:top-3 sm:right-6 sm:bottom-3" />

        <div className="relative grid grid-cols-[1fr_10rem_10rem] items-end gap-x-4 border-b-2 border-border/40 pb-4">
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
            className="relative grid grid-cols-[1fr_10rem_10rem] items-center gap-x-4 border-b border-border/30 py-3 last:border-0"
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

        <div className="relative grid grid-cols-[1fr_10rem_10rem] items-center gap-x-4 pt-5 pb-2">
          <div />
          <div className="flex justify-center">
            {enTrial ? (
              <span className="text-center text-xs text-muted-foreground">
                Incluido en tu prueba
              </span>
            ) : (
              !(plan === "BASICA" && suscripcionActiva) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cargando !== null}
                  onClick={() => suscribirse("BASICA")}
                  className="w-full max-w-[8.5rem]"
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
                disabled={cargando !== null}
                onClick={() => suscribirse("PREMIUM")}
                className="w-full max-w-[8.5rem] shadow-xs"
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
  );

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

      {mpPreapprovalStatus === "PENDING" && !pagoEnGracia && !avisoPendienteCerrado && (
        <div className="relative flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 pr-11">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary shadow-[0_4px_10px_-3px_rgba(79,70,229,0.55)]">
            <Clock className="size-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="font-heading text-sm font-bold text-primary">
              Confirmando tu suscripción con MercadoPago
            </p>
            <p className="text-sm text-foreground/70">
              Si ya completaste el pago, esto se actualiza solo en unos segundos. No hace falta
              que hagas nada más.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={cerrarAvisoPendiente}
            className="absolute top-3 right-3 flex size-6 items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
          >
            <X className="size-3.5" />
          </button>
        </div>
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
        <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
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
                    ? "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs transition-colors sm:px-4 sm:py-2 sm:text-sm"
                    : "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-4 sm:py-2 sm:text-sm"
                }
              >
                <span>{PLAN_DURACION_LABEL[d]}</span>
                {descuento > 0 && (
                  <span
                    className={
                      d === duracion
                        ? "rounded-full bg-emerald-400/25 px-1.5 py-0.5 font-heading text-[10px] font-bold text-emerald-200 tracking-tight sm:text-xs"
                        : "rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-heading text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 tracking-tight sm:text-xs"
                    }
                  >
                    -{descuento}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          Se factura mes a mes en MercadoPago, al precio con descuento de la duración elegida.
        </span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Vista Mobile y Tablet (< lg): Cards de Planes */}
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Card Básico */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Básico
                </span>
                {plan === "BASICA" && enTrial && (
                  <Badge variant="secondary" className="text-[11px]">
                    En prueba
                  </Badge>
                )}
                {plan === "BASICA" && suscripcionActiva && (
                  <Badge variant="secondary" className="text-[11px]">
                    Tu plan actual
                  </Badge>
                )}
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-2xl font-extrabold text-foreground">
                    ${precioMensualEquivalente("BASICA", duracion).toLocaleString("es-AR")}
                  </span>
                  <span className="text-xs text-muted-foreground">/ mes</span>
                </div>
                {duracion !== "MENSUAL" && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Facturación {PLAN_DURACION_LABEL[duracion].toLowerCase()}
                  </p>
                )}
              </div>

              {enTrial ? (
                <div className="rounded-lg border border-border/60 bg-muted/40 py-2 text-center text-xs font-medium text-muted-foreground">
                  Incluido en tu prueba
                </div>
              ) : plan === "BASICA" && suscripcionActiva ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 py-2 text-center text-xs font-semibold text-primary">
                  Plan actual
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={cargando !== null}
                  onClick={() => suscribirse("BASICA")}
                  className="w-full"
                >
                  {cargando === "BASICA" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Suscribirme"
                  )}
                </Button>
              )}

              <div className="border-t border-border/40 pt-3">
                <span className="text-xs font-semibold text-foreground/80">Incluye:</span>
                <ul className="mt-2.5 flex flex-col gap-2 text-xs">
                  {PLAN_FEATURES.BASICA.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Card Premium */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-primary/40 bg-primary/[0.03] p-5 shadow-xs">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-heading text-xs font-bold uppercase tracking-wider text-primary">
                  Premium
                </span>
                <Badge variant="default" className="text-[11px]">
                  Recomendado
                </Badge>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="font-heading text-2xl font-extrabold text-foreground">
                    ${precioMensualEquivalente("PREMIUM", duracion).toLocaleString("es-AR")}
                  </span>
                  <span className="text-xs text-muted-foreground">/ mes</span>
                </div>
                {duracion !== "MENSUAL" && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Facturación {PLAN_DURACION_LABEL[duracion].toLowerCase()}
                  </p>
                )}
              </div>

              {plan === "PREMIUM" && suscripcionActiva ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 py-2 text-center text-xs font-semibold text-primary">
                  Plan actual
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={cargando !== null}
                  onClick={() => suscribirse("PREMIUM")}
                  className="w-full shadow-xs"
                >
                  {cargando === "PREMIUM" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Pasar a Premium"
                  )}
                </Button>
              )}

              <div className="border-t border-primary/15 pt-3">
                <span className="text-xs font-semibold text-foreground/80">Todo lo de Básico, más:</span>
                <ul className="mt-2.5 flex flex-col gap-2 text-xs">
                  {PLAN_FEATURES.PREMIUM.slice(1).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span className="font-medium text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Botón para desplegar tabla completa en mobile */}
        <div className="flex flex-col items-center gap-3 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMostrarTablaMobile((prev) => !prev)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {mostrarTablaMobile ? "Ocultar tabla comparativa" : "Ver tabla comparativa detallada"}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                mostrarTablaMobile && "rotate-180"
              )}
            />
          </Button>

          {mostrarTablaMobile && (
            <div className="w-full animate-in fade-in-50 duration-200">
              {tablaComparativa}
            </div>
          )}
        </div>
      </div>

      {/* Vista Desktop (lg): Tabla comparativa directa */}
      <div className="hidden lg:block">
        {tablaComparativa}
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
