"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Clock, Loader2, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/settings-section";
import { CancelarSuscripcionButton } from "@/components/cancelar-suscripcion-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  calcularUpgradePremium,
  DIAS_AVISO_PLAN_POR_VENCER,
  DIAS_AVISO_TRIAL_POR_TERMINAR,
  diasRestantesDePagoUnico,
  MESES_POR_DURACION,
  PLAN_DURACION_LABEL,
  PLAN_FEATURES,
  PLAN_PRICING,
  precioMensualEquivalente,
  precioTotalDuracion,
  type PlanDuracion,
} from "@/lib/plan";
import { PAGO_BASELINE_KEY, PAGO_DIFERIDO_KEY, PAGO_INICIO_KEY } from "@/lib/pago-confirmado";
import { TIME_ZONE } from "@/lib/timezone";
import { PAGOS_HABILITADOS, PAGOS_LABEL_DESHABILITADO } from "@/lib/pagos";

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
  const [cargando, setCargando] = useState<"BASICA" | "PREMIUM" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avisoPendienteCerrado, setAvisoPendienteCerrado] = useState(false);
  const [upgradeAbierto, setUpgradeAbierto] = useState(false);

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

  // Duraciones != MENSUAL son un pago único por adelantado -- no hay nada
  // que "renovar" ni "cancelar" (ya está todo pagado), a diferencia de la
  // suscripción recurrente mensual. `planVigente` cubre ambos casos (activo
  // = tiene acceso pagado vigente, sea recurrente o prepago).
  const esRecurrente = planDuracion === "MENSUAL";
  // Se puede cancelar mientras exista una preapproval de MercadoPago que no
  // esté ya cancelada: no solo AUTHORIZED, sino también PAUSED / PENDING (un
  // estado desfasado por una notificación fuera de orden no debe dejar al
  // médico sin forma de cortar el cobro).
  const puedeCancelar =
    esRecurrente &&
    Boolean(mpPreapprovalId) &&
    mpPreapprovalStatus !== null &&
    mpPreapprovalStatus !== "CANCELLED";
  const planVigente = Boolean(planEndsAt && new Date(planEndsAt).getTime() > Date.now());
  // Canceló la suscripción mensual pero sigue con acceso hasta `planEndsAt`:
  // puede volver a contratar (la nueva compra se suma al final de lo pagado).
  const canceladoConAcceso = planVigente && esRecurrente && mpPreapprovalStatus === "CANCELLED";
  // Pago único de 6 meses o más a punto de vencer: mismo criterio que el aviso
  // del home (`DIAS_AVISO_PLAN_POR_VENCER`). Puede contratar cualquier plan y
  // duración; lo nuevo se suma al final de lo pagado.
  const diasParaVencer = diasRestantesDePagoUnico({
    planDuracion,
    planEndsAt: planEndsAt ? new Date(planEndsAt) : null,
  });
  const porVencer =
    planVigente &&
    !esRecurrente &&
    diasParaVencer !== null &&
    diasParaVencer <= DIAS_AVISO_PLAN_POR_VENCER;
  const recontratable = canceladoConAcceso || porVencer;
  // Lo que hay por delante sigue siendo compra bloqueada salvo al recontratar.
  const planBloqueaCompra = planVigente && !recontratable;
  // Con Premium pago por delante no se puede bajar a Básico sin perder lo
  // pagado (ver checkout/route.ts).
  const basicaBloqueada = recontratable && plan === "PREMIUM";
  const textoBasicaBloqueada = planEndsAt
    ? `Disponible desde el ${formatFecha(planEndsAt)}`
    : "Disponible al vencer Premium";
  const mostrarPlanes = !planVigente || recontratable;
  // Tuvo un plan pago, ya pasó su `planEndsAt` y no hay período de prueba ni
  // gracia de cobro que le dé acceso: está inactivo desde esa fecha.
  const diasDesdeVencimiento =
    planEndsAt && !planVigente && !pagoEnGracia
      ? Math.floor((Date.now() - new Date(planEndsAt).getTime()) / 86_400_000)
      : null;
  const vencido =
    diasDesdeVencimiento !== null &&
    !(plan === "BASICA" && diasRestantesDeTrial !== null && diasRestantesDeTrial > 0);
  const sinPagos = !PAGOS_HABILITADOS;
  function textoBoton(elegido: "BASICA" | "PREMIUM") {
    if (sinPagos) return PAGOS_LABEL_DESHABILITADO;
    if (vencido && elegido === plan) return "Renovar";
    if (!recontratable) return elegido === "PREMIUM" ? "Pasar a Premium" : "Contratar";
    if (duracion === "MENSUAL") return elegido === plan ? "Reactivar" : "Suscribirme";
    return elegido === plan ? `Renovar ${PLAN_DURACION_LABEL[duracion]}` : "Contratar";
  }
  // El período de prueba es exclusivo de Básico (Premium nunca lo tiene,
  // ver src/lib/plan.ts) y deja de ser relevante en cuanto hay un plan
  // pago vigente (recurrente o prepago) -- `trialEndsAt` puede seguir
  // técnicamente en el futuro (nunca se limpia), pero ya no es lo que
  // manda: `planEndsAt` lo reemplaza.
  const enTrial =
    plan === "BASICA" && !planVigente && diasRestantesDeTrial !== null && diasRestantesDeTrial > 0;
  // En la última semana de trial ya se puede contratar Básico (antes de
  // eso, el botón se reemplaza por "Incluido en tu prueba" -- ver más
  // abajo). Antes esto era simplemente `enTrial`, sin ventana.
  const bloqueaBasicoPorTrial = enTrial && diasRestantesDeTrial! > DIAS_AVISO_TRIAL_POR_TERMINAR;
  // Fecha de inicio aproximada del pago único vigente -- no se guarda en la
  // base (no hace falta un campo nuevo), se calcula restando la duración
  // elegida a `planEndsAt`, mismo criterio que ya usa `admin-metrics.ts`
  // para estimar cuándo arrancó una suscripción a partir de su vencimiento.
  const fechaInicioPrepago =
    planVigente && !esRecurrente && planEndsAt && planDuracion
      ? (() => {
          const inicio = new Date(planEndsAt);
          inicio.setMonth(inicio.getMonth() - MESES_POR_DURACION[planDuracion]);
          return inicio;
        })()
      : null;
  // Todo lo que incluye el plan actual del médico -- Premium suma lo de
  // Básico (el primer item de PLAN_FEATURES.PREMIUM, "Todo lo de Básico",
  // es solo una frase resumen, no una función propia).
  const featuresDelPlan =
    plan === "PREMIUM" ? [...PLAN_FEATURES.BASICA, ...PLAN_FEATURES.PREMIUM.slice(1)] : PLAN_FEATURES.BASICA;
  // Tabla comparativa: todo lo de Básico (incluido también en Premium) más
  // lo que suma Premium -- el primer item de PLAN_FEATURES.PREMIUM ("Todo
  // lo de Básico") es solo una frase resumen, no una fila propia.
  const filasComparacion = [
    ...PLAN_FEATURES.BASICA.map((label) => ({ label, basica: true })),
    ...PLAN_FEATURES.PREMIUM.slice(1).map((label) => ({ label, basica: false })),
  ];

  // Básico pago único vigente -> Premium hasta el mismo vencimiento, pagando
  // solo la diferencia (ver `calcularUpgradePremium` y checkout/route.ts).
  const upgrade =
    plan === "BASICA" && planVigente && !recontratable && planDuracion && planEndsAt
      ? calcularUpgradePremium({ planDuracion, planEndsAt: new Date(planEndsAt) })
      : null;

  async function suscribirse(planElegido: "BASICA" | "PREMIUM", esUpgrade = false) {
    if (sinPagos) return;
    setError(null);
    setCargando(planElegido);

    let response: Response;
    try {
      response = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planElegido, duracion, ...(esUpgrade ? { upgrade: true } : {}) }),
      });
    } catch {
      // El fetch en sí no llegó a completarse -- caída de red real, no un
      // error de negocio que el servidor haya alcanzado a responder.
      setError("No se pudo conectar con el servidor.");
      setCargando(null);
      return;
    }

    let data: { initPoint?: string; ultimoPagoId?: string | null; cobroDiferido?: boolean; error?: string };
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
    try {
      localStorage.setItem(PAGO_BASELINE_KEY, data.ultimoPagoId ?? "");
      localStorage.setItem(PAGO_INICIO_KEY, String(Date.now()));
      if (data.cobroDiferido) localStorage.setItem(PAGO_DIFERIDO_KEY, "1");
      else localStorage.removeItem(PAGO_DIFERIDO_KEY);
    } catch {
      // Sin storage el modal cae al criterio de "pago reciente" -- no es crítico.
    }
    window.location.href = data.initPoint;
  }

  const tablaComparativa = (
    <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
      <div className="relative min-w-[620px] p-5 sm:p-6">
        <div className="pointer-events-none absolute top-2.5 right-5 bottom-2.5 w-48 rounded-2xl bg-primary/5 sm:top-3 sm:right-6 sm:bottom-3" />

        <div className="relative grid grid-cols-[1fr_12rem_12rem] items-end gap-x-4 border-b-2 border-border/40 pb-4">
          <div />
          <div className="text-center">
            <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
              Básico
            </div>
            <div className="mt-1 text-xl font-extrabold">
              ${precioMensualEquivalente("BASICA", duracion).toLocaleString("es-AR")}
            </div>
            <div className="text-[11px] text-muted-foreground">por mes</div>
            {duracion !== "MENSUAL" && (
              <div className="text-[11px] font-semibold text-foreground/70">
                ${precioTotalDuracion("BASICA", duracion).toLocaleString("es-AR")} total, pago único
              </div>
            )}
          </div>
          <div className="text-center">
            <div className="text-xs font-bold tracking-wide text-primary uppercase">Premium</div>
            <div className="mt-1 text-xl font-extrabold">
              ${precioMensualEquivalente("PREMIUM", duracion).toLocaleString("es-AR")}
            </div>
            <div className="text-[11px] text-muted-foreground">por mes</div>
            {duracion !== "MENSUAL" && (
              <div className="text-[11px] font-semibold text-foreground/70">
                ${precioTotalDuracion("PREMIUM", duracion).toLocaleString("es-AR")} total, pago único
              </div>
            )}
          </div>
        </div>

        {filasComparacion.map((fila) => (
          <div
            key={fila.label}
            className="relative grid grid-cols-[1fr_12rem_12rem] items-center gap-x-4 border-b border-border/30 py-3 last:border-0"
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

        <div className="relative grid grid-cols-[1fr_12rem_12rem] items-center gap-x-4 pt-5 pb-2">
          <div />
          <div className="flex justify-center">
            {bloqueaBasicoPorTrial ? (
              <span className="text-center text-xs text-muted-foreground">
                Incluido en tu prueba
              </span>
            ) : basicaBloqueada ? (
              <span className="text-center text-xs text-muted-foreground">
                {textoBasicaBloqueada}
              </span>
            ) : (
              !(plan === "BASICA" && planBloqueaCompra) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sinPagos || cargando !== null}
                  onClick={() => suscribirse("BASICA")}
                  className="w-full max-w-[10.5rem]"
                >
                  {cargando === "BASICA" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    textoBoton("BASICA")
                  )}
                </Button>
              )
            )}
          </div>
          <div className="flex justify-center">
            {!(plan === "PREMIUM" && planBloqueaCompra) && (
              <Button
                type="button"
                size="sm"
                disabled={sinPagos || cargando !== null}
                onClick={() => suscribirse("PREMIUM")}
                className="w-full max-w-[10.5rem] shadow-xs"
              >
                {cargando === "PREMIUM" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  textoBoton("PREMIUM")
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
            disabled={sinPagos || cargando !== null}
            onClick={() => suscribirse(plan)}
            className="shrink-0 border-amber-400 bg-transparent text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
          >
            {cargando === plan ? (
              <Loader2 className="size-4 animate-spin" />
            ) : sinPagos ? (
              PAGOS_LABEL_DESHABILITADO
            ) : (
              "Reintentar pago"
            )}
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

      <SettingsSection title="Tu plan actual" icon={Sparkles}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {vencido ? (
              <Badge
                variant="secondary"
                className="border border-red-300 bg-red-50 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              >
                {plan === "PREMIUM" ? "Premium" : "Básico"} · Vencido
              </Badge>
            ) : (
              <Badge variant={plan === "PREMIUM" ? "default" : "secondary"} className="text-sm">
                {plan === "PREMIUM" ? "Premium" : "Básico"}
              </Badge>
            )}
            {vencido && planEndsAt && diasDesdeVencimiento !== null && (
              <div className="flex min-w-[14rem] flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">
                  Inactivo desde el {formatFecha(planEndsAt)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {diasDesdeVencimiento <= 0
                    ? "Venció hoy. "
                    : `Hace ${diasDesdeVencimiento} ${diasDesdeVencimiento === 1 ? "día" : "días"}. `}
                  Tus datos están guardados y vuelven a estar disponibles al renovar.
                </span>
              </div>
            )}
            {vencido && (
              <Button
                type="button"
                size="sm"
                disabled={sinPagos || cargando !== null}
                onClick={() => suscribirse(plan)}
                className="shadow-xs"
              >
                {cargando === plan ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : sinPagos ? (
                  PAGOS_LABEL_DESHABILITADO
                ) : (
                  `Renovar ${plan === "PREMIUM" ? "Premium" : "Básico"}`
                )}
              </Button>
            )}
            {enTrial && (
              <span className="text-sm text-muted-foreground">
                Período de prueba: quedan {diasRestantesDeTrial}{" "}
                {diasRestantesDeTrial === 1 ? "día" : "días"}
                {trialEndsAt && ` (hasta el ${formatFecha(trialEndsAt)})`}.
              </span>
            )}
            {/* Para un pago único, la fecha ya se muestra en la franja
                Inicio/Vence de más abajo -- repetirla acá sería
                redundante, así que en ese caso alcanza con la duración. */}
            {canceladoConAcceso && planEndsAt && (
              <>
                <Badge variant="secondary" className="text-sm">
                  Cancelado
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {planDuracion && `${PLAN_DURACION_LABEL[planDuracion]} · `}
                  acceso hasta el {formatFecha(planEndsAt)}, sin renovación.
                </span>
              </>
            )}
            {planVigente && planEndsAt && esRecurrente && !recontratable && (
              <span className="text-sm text-muted-foreground">
                {planDuracion && `${PLAN_DURACION_LABEL[planDuracion]} · `}
                se renueva el {formatFecha(planEndsAt)}.
              </span>
            )}
            {planVigente && !esRecurrente && planDuracion && (
              <span className="text-sm text-muted-foreground">
                {PLAN_DURACION_LABEL[planDuracion]} · pago único, sin renovación automática.
              </span>
            )}
            {porVencer && diasParaVencer !== null && (
              <Badge
                variant="secondary"
                className="border border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
              >
                {diasParaVencer <= 0
                  ? "Vence hoy"
                  : `Vence en ${diasParaVencer} ${diasParaVencer === 1 ? "día" : "días"}`}
              </Badge>
            )}
          </div>

          {fechaInicioPrepago && planEndsAt && (
            <div className="flex gap-7 rounded-xl bg-muted/40 px-4 py-3">
              <div>
                <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Inicio
                </div>
                <div className="mt-0.5 text-sm font-bold">{formatFecha(fechaInicioPrepago.toISOString())}</div>
              </div>
              <div className="w-px bg-border/60" />
              <div>
                <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                  Vence
                </div>
                <div className="mt-0.5 text-sm font-bold">{formatFecha(planEndsAt)}</div>
              </div>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* Con un plan pago vigente, esto reemplaza al selector de duración y
          a la tabla comparativa (ver más abajo, ocultos en ese caso): la
          lista de lo que ya incluye el plan actual y, si es Básico, una
          invitación a subir a Premium (a diferencia de bajar de categoría,
          esto no tiene el problema de "perder lo ya pagado sin reembolso"). */}
      {planVigente &&
        !recontratable &&
        (plan === "PREMIUM" ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5 sm:p-6">
            <div>
              <div className="mb-2.5 text-xs font-semibold text-foreground/80">Incluye:</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {featuresDelPlan.map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            {puedeCancelar && (
              <CancelarSuscripcionButton
                fechaVencimiento={planEndsAt ? formatFecha(planEndsAt) : null}
              />
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5 sm:p-6">
              <div>
                <div className="mb-2.5 text-xs font-semibold text-foreground/80">Incluye:</div>
                <div className="flex flex-col gap-2">
                  {featuresDelPlan.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
              {puedeCancelar && (
                <CancelarSuscripcionButton
                  fechaVencimiento={planEndsAt ? formatFecha(planEndsAt) : null}
                />
              )}
            </div>

            {!recontratable && (
            <div className="relative flex flex-col gap-3.5 rounded-xl border-2 border-primary/40 bg-primary/5 p-5 sm:p-6">
              <span className="absolute -top-3 left-5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
                Upgrade disponible
              </span>
              <div className="mt-1">
                <div className="font-heading text-sm font-bold text-primary">Premium</div>
                <div className="text-xs text-foreground/70">Todo lo de Básico, más:</div>
              </div>
              <div className="flex flex-col gap-2">
                {PLAN_FEATURES.PREMIUM.slice(1).map((f) => (
                  <div key={f} className="flex items-start gap-2 text-sm font-medium text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              {upgrade && planEndsAt && (
                <div className="flex flex-col gap-0.5 rounded-lg border border-primary/30 bg-card px-3.5 py-3">
                  <span className="text-xs text-muted-foreground">
                    Premium hasta el {formatFecha(planEndsAt)}
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-heading text-xl font-extrabold tabular-nums">
                      ${upgrade.aPagar.toLocaleString("es-AR")}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums line-through">
                      ${upgrade.totalPremium.toLocaleString("es-AR")}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Ya descontamos lo que pagaste de Básico
                  </span>
                </div>
              )}
              <Button
                type="button"
                size="sm"
                disabled={sinPagos || cargando !== null}
                onClick={() => (upgrade ? setUpgradeAbierto(true) : suscribirse("PREMIUM"))}
                className="mt-auto shadow-xs"
              >
                {cargando === "PREMIUM" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : sinPagos ? (
                  PAGOS_LABEL_DESHABILITADO
                ) : upgrade ? (
                  `Pasar a Premium · pagás $${upgrade.aPagar.toLocaleString("es-AR")}`
                ) : (
                  "Pasar a Premium"
                )}
              </Button>
              {upgrade && (
                <p className="-mt-1.5 text-center text-xs text-muted-foreground">
                  Tu fecha de vencimiento no cambia.
                </p>
              )}
            </div>
            )}
          </div>
        ))}

      {/* El selector solo tiene sentido para elegir CON qué duración
          arrancar un plan nuevo -- si ya hay uno vigente (recurrente o
          prepago), cambiar la duración acá no tiene ningún efecto (no hay
          botón que la aplique), así que se oculta para no sugerir una
          acción que no existe. */}
      {mostrarPlanes && (
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
            {duracion === "MENSUAL"
              ? "Se factura mes a mes en MercadoPago, cancelás cuando quieras."
              : "Pago único por adelantado en MercadoPago, sin renovación automática -- al vencer, se vuelve a pagar para seguir."}
          </span>
          {recontratable && planEndsAt && (
            <span className="rounded-lg bg-primary/10 px-3 py-2 text-xs text-foreground/80">
              {basicaBloqueada
                ? `Seguís con Premium hasta el ${formatFecha(planEndsAt)}; Básico se puede elegir después. `
                : `Seguís con tu plan hasta el ${formatFecha(planEndsAt)}. `}
              {duracion === "MENSUAL"
                ? `La suscripción mensual empieza a cobrarse ese día.`
                : plan === "PREMIUM"
                  ? `Lo que pagues se suma a continuación del tiempo que ya tenés.`
                  : `Si elegís Premium, empieza hoy y se suma al tiempo que ya tenés.`}
            </span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {upgrade && planEndsAt && (
        <Dialog open={upgradeAbierto} onOpenChange={(abierto) => cargando === null && setUpgradeAbierto(abierto)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pasar a Premium</DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground">
              Premium queda activo desde hoy hasta el mismo vencimiento que ya tenés:{" "}
              <strong className="text-foreground">{formatFecha(planEndsAt)}</strong>.
            </p>

            <div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border/60 text-sm tabular-nums">
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <span>Premium por el tiempo que te queda</span>
                <span>${upgrade.totalPremium.toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between gap-3 px-3.5 py-2.5">
                <span>Crédito por tu Básico sin usar</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  − ${upgrade.creditoBasico.toLocaleString("es-AR")}
                </span>
              </div>
              <div className="flex justify-between gap-3 rounded-b-xl bg-muted/40 px-3.5 py-2.5 text-base font-bold">
                <span>Pagás hoy</span>
                <span>${upgrade.aPagar.toLocaleString("es-AR")}</span>
              </div>
            </div>

            <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
              <li>Pago único. No se renueva solo.</li>
              <li>Al vencer el {formatFecha(planEndsAt)} podés renovar Premium.</li>
              <li>Las funciones de IA y el WhatsApp automático se activan al confirmarse el pago.</li>
            </ul>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setUpgradeAbierto(false)}
                disabled={cargando !== null}
              >
                Volver
              </Button>
              <Button type="button" disabled={sinPagos || cargando !== null} onClick={() => suscribirse("PREMIUM", true)}>
                {cargando === "PREMIUM" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  `Pagar $${upgrade.aPagar.toLocaleString("es-AR")} con MercadoPago`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Con un plan pago vigente (recurrente o prepago) no hay ninguna acción
          segura que ofrecer acá: bajar de categoría pierde lo ya pagado sin
          reembolso, y subir de categoría requeriría prorratear el tiempo
          restante -- ninguno de los dos existe todavía. Se oculta toda la
          comparación hasta que el plan actual venza o se cancele. */}
      {mostrarPlanes && (
        <>
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
                {plan === "BASICA" && planVigente && (
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
                  <p className="mt-0.5 text-[11px] font-semibold text-foreground/70">
                    ${precioTotalDuracion("BASICA", duracion).toLocaleString("es-AR")} total, pago
                    único · {PLAN_DURACION_LABEL[duracion].toLowerCase()}
                  </p>
                )}
              </div>

              {bloqueaBasicoPorTrial ? (
                <div className="rounded-lg border border-border/60 bg-muted/40 py-2 text-center text-xs font-medium text-muted-foreground">
                  Incluido en tu prueba
                </div>
              ) : basicaBloqueada ? (
                <div className="rounded-lg border border-border/60 bg-muted/40 py-2 text-center text-xs font-medium text-muted-foreground">
                  {textoBasicaBloqueada}
                </div>
              ) : plan === "BASICA" && planBloqueaCompra ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 py-2 text-center text-xs font-semibold text-primary">
                  Plan actual
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sinPagos || cargando !== null}
                  onClick={() => suscribirse("BASICA")}
                  className="w-full"
                >
                  {cargando === "BASICA" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    textoBoton("BASICA")
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
                  <p className="mt-0.5 text-[11px] font-semibold text-foreground/70">
                    ${precioTotalDuracion("PREMIUM", duracion).toLocaleString("es-AR")} total, pago
                    único · {PLAN_DURACION_LABEL[duracion].toLowerCase()}
                  </p>
                )}
              </div>

              {plan === "PREMIUM" && planBloqueaCompra ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 py-2 text-center text-xs font-semibold text-primary">
                  Plan actual
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  disabled={sinPagos || cargando !== null}
                  onClick={() => suscribirse("PREMIUM")}
                  className="w-full shadow-xs"
                >
                  {cargando === "PREMIUM" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    textoBoton("PREMIUM")
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
      </div>

          {/* Vista Desktop (lg): Tabla comparativa directa */}
          <div className="hidden lg:block">{tablaComparativa}</div>
        </>
      )}
    </div>
  );
}
