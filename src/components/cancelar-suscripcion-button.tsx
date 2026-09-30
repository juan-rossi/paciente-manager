"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CANCELACION_DETALLE_MAX,
  CANCELACION_MOTIVOS,
  type CancelacionMotivo,
} from "@/lib/cancelacion-motivos";

type Props = {
  // Fecha ya formateada en la que vence el acceso (`planEndsAt`).
  fechaVencimiento: string | null;
};

export function CancelarSuscripcionButton({ fechaVencimiento }: Props) {
  const [open, setOpen] = useState(false);
  const [entiendo, setEntiendo] = useState(false);
  const [motivo, setMotivo] = useState<CancelacionMotivo | "">("");
  const [detalle, setDetalle] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    // No se cierra a mitad de la request: la cancelación ya está en camino.
    if (cancelando) return;
    setOpen(next);
    if (!next) {
      setEntiendo(false);
      setMotivo("");
      setDetalle("");
      setError(null);
    }
  }

  async function confirmar() {
    setError(null);
    setCancelando(true);
    try {
      const response = await fetch("/api/mercadopago/cancelar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivo: motivo || undefined,
          detalle: motivo === "OTRO" ? detalle : undefined,
        }),
      });
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
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="self-start text-muted-foreground hover:border-destructive/40 hover:text-destructive"
      >
        Cancelar suscripción
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar tu suscripción?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {fechaVencimiento ? (
              <>
                Vas a poder usar Semio 360 hasta el <strong>{fechaVencimiento}</strong>.{" "}
              </>
            ) : (
              "Vas a poder usar Semio 360 hasta el final del período que ya pagaste. "
            )}
            Después de esa fecha no vas a poder seguir utilizando la aplicación, a menos que vuelvas a
            contratar un plan.
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cancelacion-motivo">¿Por qué cancelás? (opcional)</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as CancelacionMotivo)}>
              <SelectTrigger id="cancelacion-motivo" className="w-full">
                <SelectValue>
                  {(v: CancelacionMotivo | "") => (v ? CANCELACION_MOTIVOS[v] : "Elegí un motivo")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(CANCELACION_MOTIVOS) as CancelacionMotivo[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {CANCELACION_MOTIVOS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {motivo === "OTRO" && (
              <Textarea
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
                maxLength={CANCELACION_DETALLE_MAX}
                placeholder="Contanos brevemente el motivo"
                aria-label="Detalle del motivo"
                rows={3}
              />
            )}
          </div>

          <label
            htmlFor="cancelacion-entiendo"
            className="flex cursor-pointer items-start gap-2.5 text-sm"
          >
            <input
              id="cancelacion-entiendo"
              type="checkbox"
              checked={entiendo}
              onChange={(e) => setEntiendo(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 accent-primary"
            />
            <span>
              Entiendo que perderé el acceso
              {fechaVencimiento ? ` el ${fechaVencimiento}` : " al vencer el período pagado"}.
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" onClick={() => handleOpenChange(false)} disabled={cancelando}>
              Volver
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmar}
              disabled={!entiendo || cancelando}
            >
              {cancelando ? <Loader2 className="size-4 animate-spin" /> : "Sí, cancelar suscripción"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
