"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { TicketEstado } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ESTADO_LABELS, ESTADOS } from "@/lib/soporte";
import { cn } from "@/lib/utils";

// Caja de respuesta de /admin/soporte: respuesta al usuario o nota interna,
// y cambio de estado en la misma acción.
export function SoporteRespuesta({
  ticketId,
  estadoActual,
  nombreAutor,
}: {
  ticketId: string;
  estadoActual: TicketEstado;
  nombreAutor: string;
}) {
  const router = useRouter();
  const [cuerpo, setCuerpo] = useState("");
  const [interno, setInterno] = useState(false);
  const [estado, setEstado] = useState<TicketEstado>(
    // Al responder algo nuevo, lo natural es pasarlo a "En revisión".
    estadoActual === "NUEVO" ? "EN_REVISION" : estadoActual
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hayTexto = cuerpo.trim().length > 0;
  const cambiaEstado = estado !== estadoActual;
  const puedeEnviar = hayTexto || cambiaEstado;

  let etiqueta = "Cambiar estado";
  if (hayTexto) {
    const base = interno ? "Guardar nota" : "Responder";
    etiqueta = cambiaEstado ? `${base} y pasar a ${ESTADO_LABELS[estado]}` : base;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!puedeEnviar) return;
    setError(null);
    setEnviando(true);
    try {
      const response = await fetch(`/api/admin/soporte/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuerpo: hayTexto ? cuerpo : undefined,
          interno,
          estado: cambiaEstado ? estado : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      setCuerpo("");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <div role="tablist" aria-label="Tipo de mensaje" className="flex w-fit rounded-lg border border-border p-0.5">
        {[
          { value: false, label: "Respuesta" },
          { value: true, label: "Nota interna" },
        ].map((op) => (
          <button
            key={op.label}
            type="button"
            role="tab"
            aria-selected={interno === op.value}
            onClick={() => setInterno(op.value)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              interno === op.value
                ? op.value
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200"
                  : "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {op.label}
          </button>
        ))}
      </div>

      <Textarea
        id={`soporte-admin-${ticketId}`}
        aria-label={interno ? "Nota interna" : `Respuesta para ${nombreAutor}`}
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        placeholder={
          interno
            ? "Solo la ve el equipo. Ej.: Reproducido en QA, pasa con varios lugares de trabajo."
            : `Hola ${nombreAutor}, gracias por escribirnos…`
        }
        className={cn("min-h-28", interno && "border-amber-300 dark:border-amber-400/40")}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Estado</span>
          <select
            id={`soporte-estado-${ticketId}`}
            value={estado}
            onChange={(e) => setEstado(e.target.value as TicketEstado)}
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABELS[e]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={enviando || !puedeEnviar}>
          {enviando && <Loader2 className="size-4 animate-spin" />}
          {etiqueta}
        </Button>
      </div>
      {!interno && hayTexto && (
        <p className="text-xs text-muted-foreground">
          {nombreAutor} la ve en Semio 360 y le llega un aviso por email.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
