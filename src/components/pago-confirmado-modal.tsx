"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  PAGO_BASELINE_KEY,
  PAGO_CELEBRADO_KEY,
  PAGO_DIFERIDO_KEY,
  PAGO_INICIO_KEY,
  PAGO_RECIENTE_MS,
  PAGO_RETORNO_MS,
} from "@/lib/pago-confirmado";
import { PLAN_DURACION_LABEL, type PlanDuracion } from "@/lib/plan";
import { TIME_ZONE } from "@/lib/timezone";

type Estado = {
  ultimoPago: { id: string; createdAt: string } | null;
  plan: "BASICA" | "PREMIUM" | null;
  planDuracion: PlanDuracion | null;
  planEndsAt: string | null;
  mpPreapprovalStatus: "PENDING" | "AUTHORIZED" | "PAUSED" | "CANCELLED" | null;
};

const INTERVALO_MS = 2500;
// Si el webhook no confirma en este tiempo, el modal se cierra solo y queda
// el aviso "Confirmando tu suscripción" de "Mi plan" (que se actualiza solo).
const ESPERA_MAXIMA_MS = 60_000;
const COLORES = ["#4f46e5", "#16a34a", "#f59e0b", "#ec4899", "#06b6d4", "#8b85ff"];

function leer(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function guardar(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Sin storage, a lo sumo la animación se repite al recargar -- la URL ya
    // se limpió, así que no vuelve a dispararse por eso.
  }
}

// Un pago cuenta como "recién confirmado" si es distinto al que había antes
// de arrancar el checkout, no se celebró ya y es reciente.
function esPagoNuevo(pago: Estado["ultimoPago"]) {
  if (!pago) return false;
  if (Date.now() - new Date(pago.createdAt).getTime() > PAGO_RECIENTE_MS) return false;
  if (leer(PAGO_CELEBRADO_KEY) === pago.id) return false;
  const baseline = leer(PAGO_BASELINE_KEY);
  return !baseline || baseline !== pago.id;
}

// Volvió del checkout si la URL lo dice (`?pago=retorno`) o, como respaldo por
// si MercadoPago descartó los query params del `back_url`, si salió hacia el
// checkout hace poco (`PAGO_INICIO_KEY`, que se borra al empezar a esperar la
// confirmación, no acá: en StrictMode este chequeo corre dos veces).
function volvioDelCheckout(retornoPorUrl: boolean) {
  if (retornoPorUrl) return true;
  const inicio = Number(leer(PAGO_INICIO_KEY));
  return inicio > 0 && Date.now() - inicio < PAGO_RETORNO_MS;
}

function Confeti({ onFin }: { onFin: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const particulas = Array.from({ length: 90 }, (_, i) => {
      const lado = i % 2 ? 1 : -1;
      return {
        x: W / 2 + lado * 24,
        y: H * 0.42,
        vx: lado * (1.5 + Math.random() * 6) * (Math.random() > 0.3 ? 1 : -1),
        vy: -(6 + Math.random() * 8),
        s: 5 + Math.random() * 6,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        color: COLORES[i % COLORES.length],
      };
    });

    const inicio = performance.now();
    const DURACION = 2400;
    let raf = 0;
    function frame(ahora: number) {
      const t = ahora - inicio;
      ctx!.clearRect(0, 0, W, H);
      if (t > DURACION) {
        onFin();
        return;
      }
      for (const p of particulas) {
        p.vy += 0.25;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx!.globalAlpha = Math.max(0, 1 - t / DURACION);
        ctx!.fillStyle = p.color;
        ctx!.save();
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx!.restore();
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [onFin]);

  return createPortal(
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] size-full"
    />,
    document.body
  );
}

function CheckAnimado() {
  return (
    <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
      <circle className="pago-check-circle fill-emerald-500" cx="32" cy="32" r="30" />
      <path
        className="pago-check-path"
        d="M19 33l9 9 17-19"
        fill="none"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Modal que se muestra al volver del checkout de MercadoPago (`?pago=retorno`,
// ver `src/lib/mercadopago.ts`). El redirect NO prueba que el pago se haya
// aprobado, así que primero espera ("Confirmando tu pago…") consultando
// `/api/mercadopago/estado` hasta ver el `PagoSuscripcion` que crea el webhook;
// recién ahí pasa al check, el confeti y el resumen. Si no se confirma a
// tiempo (o el médico lo cierra), no celebra nada.
export function PagoConfirmadoModal({ retornoDePago }: { retornoDePago: boolean }) {
  const router = useRouter();
  // Se captura al montar: `router.refresh()` re-evalúa la URL (ya sin
  // `pago=retorno`) y no debe desmontar el modal a la mitad de la celebración.
  const [activo, setActivo] = useState(retornoDePago);
  const [abierto, setAbierto] = useState(retornoDePago);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [confeti, setConfeti] = useState(false);
  const [diferidoConfirmado, setDiferidoConfirmado] = useState(false);

  // localStorage solo existe en el cliente, por eso el respaldo se evalúa acá
  // y no en el estado inicial (evita un mismatch de hidratación).
  useEffect(() => {
    if (!volvioDelCheckout(retornoDePago)) return;
    const t = setTimeout(() => {
      setActivo(true);
      setAbierto(true);
    }, 0);
    return () => clearTimeout(t);
    // Solo al montar: `retornoDePago` cambia al limpiar la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activo) return;

    // Que recargar la página no vuelva a disparar esto.
    try {
      localStorage.removeItem(PAGO_INICIO_KEY);
    } catch {
      // Sin storage no hay respaldo; la URL ya se limpia abajo.
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("pago");
    window.history.replaceState(null, "", url.pathname + url.search);

    // Recontratación con el primer cobro a futuro: no entra ningún pago ahora,
    // así que se confirma por el alta de la suscripción (AUTHORIZED).
    const diferido = leer(PAGO_DIFERIDO_KEY) === "1";
    let cancelado = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();

    async function consultar() {
      try {
        const res = await fetch("/api/mercadopago/estado", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Estado;
          if (cancelado) return;
          if (diferido && data.mpPreapprovalStatus === "AUTHORIZED") {
            try {
              localStorage.removeItem(PAGO_DIFERIDO_KEY);
            } catch {
              // Sin storage, a lo sumo se reevalúa en el próximo retorno.
            }
            setDiferidoConfirmado(true);
            setEstado(data);
            setConfeti(true);
            router.refresh();
            return;
          }
          if (!diferido && esPagoNuevo(data.ultimoPago)) {
            guardar(PAGO_CELEBRADO_KEY, data.ultimoPago!.id);
            setEstado(data);
            setConfeti(true);
            router.refresh();
            return;
          }
        }
      } catch {
        // Falla de red puntual -- se reintenta en el próximo ciclo.
      }
      if (cancelado) return;
      if (Date.now() - inicio >= ESPERA_MAXIMA_MS) {
        setAbierto(false);
        return;
      }
      timer = setTimeout(consultar, INTERVALO_MS);
    }
    consultar();

    return () => {
      cancelado = true;
      if (timer) clearTimeout(timer);
    };
  }, [activo, router]);

  if (!activo) return null;

  const reducirMovimiento =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <>
      <Dialog
        open={abierto}
        onOpenChange={(open) => {
          setAbierto(open);
          // Al cerrar la celebración se re-lee el plan: asegura que avisos
          // como "Reintentar pago" desaparezcan con el estado ya actualizado.
          if (!open && estado) router.refresh();
        }}
      >
        <DialogContent showCloseButton={false} className="items-center gap-3 p-6 text-center sm:max-w-sm">
          {!estado ? (
            <>
              <div
                aria-hidden
                className="mx-auto size-16 animate-spin rounded-full border-[5px] border-primary/15 border-t-primary motion-reduce:animate-none"
              />
              <DialogTitle className="text-lg font-bold">Confirmando tu pago…</DialogTitle>
              <DialogDescription>
                Esto tarda unos segundos. Podés quedarte en esta pantalla, se actualiza sola.
              </DialogDescription>
              <Button variant="ghost" size="sm" onClick={() => setAbierto(false)}>
                Cerrar
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto">
                <CheckAnimado />
              </div>
              <DialogTitle className="text-lg font-bold">
                {diferidoConfirmado ? "¡Suscripción reactivada!" : "¡Pago confirmado!"}
              </DialogTitle>
              <DialogDescription>
                {diferidoConfirmado
                  ? "No se cobra nada hoy: el primer cobro es cuando termina tu período actual."
                  : "Tu plan ya está activo."}
              </DialogDescription>
              <dl className="flex w-full flex-col gap-1.5 rounded-xl bg-muted p-3 text-left text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="font-semibold">{estado.plan === "PREMIUM" ? "Premium" : "Básico"}</dd>
                </div>
                {estado.planDuracion && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Duración</dt>
                    <dd className="font-semibold">{PLAN_DURACION_LABEL[estado.planDuracion]}</dd>
                  </div>
                )}
                {estado.planEndsAt && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Vigente hasta</dt>
                    <dd className="font-semibold">
                      {new Date(estado.planEndsAt).toLocaleDateString("es-AR", { timeZone: TIME_ZONE })}
                    </dd>
                  </div>
                )}
              </dl>
              <Button className="w-full" onClick={() => setAbierto(false)}>
                Empezar
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      {confeti && !reducirMovimiento && <Confeti onFin={() => setConfeti(false)} />}
    </>
  );
}
