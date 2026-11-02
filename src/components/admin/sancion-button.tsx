"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CircleMinus, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TipoSancion } from "@/lib/sancion-email";

type Props = {
  doctorId: string;
  nombre: string;
  // Rótulo de plan ya armado ("Trial · Básico", "Premium · Anual"), que es
  // lo que decide el tipo de sanción (ver `sancionQueCorresponde`).
  planLabel: string;
  tipo: TipoSancion;
  // Solo para la suspensión: a quién más afecta.
  turnosFuturos: number;
  secretarias: number;
  // La revisión desde la que se sanciona, para ofrecer rechazarla también.
  revisionId?: string;
  motivoSugerido: string;
};

// "Suspender cuenta" (trial) o "Quitar del directorio" (plan pago) en una
// tarjeta de /admin/moderacion. El server vuelve a decidir el tipo con el plan
// vigente; acá solo cambia el texto.
export function SancionButton({
  doctorId,
  nombre,
  planLabel,
  tipo,
  turnosFuturos,
  secretarias,
  revisionId,
  motivoSugerido,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState(motivoSugerido);
  const [rechazarRevision, setRechazarRevision] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esSuspension = tipo === "SUSPENSION";
  const accion = esSuspension ? "Suspender cuenta" : "Quitar del directorio";
  const Icon = esSuspension ? Ban : CircleMinus;

  function handleOpenChange(next: boolean) {
    if (enviando) return;
    setOpen(next);
    if (!next) {
      setMotivo(motivoSugerido);
      setRechazarRevision(true);
      setError(null);
    }
  }

  async function confirmar() {
    setError(null);
    setEnviando(true);
    try {
      const response = await fetch(`/api/admin/medicos/${doctorId}/sancion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo,
          revisionRechazadaId: revisionId && rechazarRevision ? revisionId : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo aplicar la sanción.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  const afectados = [
    turnosFuturos > 0 && (turnosFuturos === 1 ? "1 turno a futuro" : `${turnosFuturos} turnos a futuro`),
    secretarias > 0 && (secretarias === 1 ? "1 secretaria" : `${secretarias} secretarias`),
  ].filter(Boolean);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
      >
        <Icon className="size-4" />
        {accion}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {esSuspension ? `Suspender a ${nombre}` : `Quitar a ${nombre} del directorio`}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline">{planLabel}</Badge>
              {esSuspension
                ? "Está en período de prueba: se suspende la cuenta."
                : "Tiene un plan pago: sigue usando la app, solo sale del directorio."}
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {esSuspension
              ? "Se cierran sus sesiones y no podrá volver a entrar. Sus pacientes, historias clínicas y turnos se conservan."
              : "Su perfil y su agenda pública dejan de verse y no los puede volver a activar. Sigue atendiendo y gestionando turnos con normalidad."}{" "}
            Le llega un mail avisándole, con el motivo.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`sancion-motivo-${doctorId}`}>Motivo (lo ve el médico)</Label>
            <Textarea
              id={`sancion-motivo-${doctorId}`}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          {revisionId && (
            <label
              htmlFor={`sancion-rechazar-${doctorId}`}
              className="flex cursor-pointer items-start gap-2.5 text-sm"
            >
              <input
                id={`sancion-rechazar-${doctorId}`}
                type="checkbox"
                checked={rechazarRevision}
                onChange={(e) => setRechazarRevision(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>
                Rechazar también este cambio
                <span className="block text-xs text-muted-foreground">
                  Si no, queda pendiente en la lista.
                </span>
              </span>
            </label>
          )}

          {esSuspension && afectados.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <span className="font-semibold">Tiene {afectados.join(" y ")}.</span> Los turnos no
              se cancelan y las secretarias pierden el acceso a esta cuenta mientras dure la
              suspensión.
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmar} disabled={enviando || !motivo.trim()}>
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <Icon className="size-4" />}
              {accion}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// "Reactivar cuenta" / "Volver a mostrar en el directorio" en la ficha del médico.
export function LevantarSancionButton({ doctorId, tipo }: { doctorId: string; tipo: TipoSancion }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function levantar() {
    setError(null);
    setEnviando(true);
    try {
      const response = await fetch(`/api/admin/medicos/${doctorId}/sancion`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo levantar la sanción.");
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button type="button" variant="outline" onClick={levantar} disabled={enviando}>
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
        {tipo === "SUSPENSION" ? "Reactivar cuenta" : "Volver a mostrar en el directorio"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
