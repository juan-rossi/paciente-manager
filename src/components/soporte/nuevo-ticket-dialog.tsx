"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bug, CircleCheck, Lightbulb, Loader2, MessageCircleQuestion } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_ASUNTO } from "@/lib/soporte";
import { cn } from "@/lib/utils";

export type TipoTicket = "SUGERENCIA" | "PROBLEMA" | "OTRO";

const TIPOS: { value: TipoTicket; label: string; icon: typeof Lightbulb }[] = [
  { value: "SUGERENCIA", label: "Sugerencia", icon: Lightbulb },
  { value: "PROBLEMA", label: "Algo no funciona", icon: Bug },
  { value: "OTRO", label: "Otro", icon: MessageCircleQuestion },
];

const PLACEHOLDERS: Record<TipoTicket, { asunto: string; cuerpo: string }> = {
  SUGERENCIA: {
    asunto: "Ej.: Poder mover un turno arrastrándolo",
    cuerpo: "Contanos qué te gustaría que haga Semio 360 y cómo te ayudaría en el día a día.",
  },
  PROBLEMA: {
    asunto: "Ej.: No se descarga el PDF de la receta",
    cuerpo:
      "Contanos qué estabas haciendo, qué esperabas que pase y qué pasó. Cuanto más detalle, más rápido lo resolvemos.",
  },
  OTRO: { asunto: "Ej.: Consulta sobre mi plan", cuerpo: "Escribinos lo que necesites." },
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoInicial?: TipoTicket;
};

export function NuevoTicketDialog({ open, onOpenChange, tipoInicial = "SUGERENCIA" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [tipo, setTipo] = useState<TipoTicket>(tipoInicial);
  const [asunto, setAsunto] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviadoId, setEnviadoId] = useState<string | null>(null);

  // Cada apertura arranca limpia y con el tipo del botón que la abrió.
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setTipo(tipoInicial);
    setAsunto("");
    setCuerpo("");
    setError(null);
    setEnviadoId(null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, tipoInicial]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const response = await fetch("/api/soporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, asunto, cuerpo, pantalla: pathname }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo enviar el mensaje.");
        return;
      }
      setEnviadoId(data.id);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {enviadoId ? (
          <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
            <CircleCheck className="size-10 text-emerald-600 dark:text-emerald-400" />
            <DialogTitle className="font-heading text-lg">¡Gracias por escribirnos!</DialogTitle>
            <DialogDescription className="max-w-sm">
              Recibimos tu mensaje. Lo vamos a leer con atención y te respondemos por acá; también te avisamos por
              email.
            </DialogDescription>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Link href={`/soporte/${enviadoId}`} onClick={() => onOpenChange(false)} className={buttonVariants()}>
                Ver mi mensaje
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle className="font-heading text-base">¿Cómo podemos mejorar?</DialogTitle>
              <DialogDescription>
                Que estés conforme con Semio 360 es lo más importante para nosotros. Contanos qué te falta, qué
                cambiarías o qué no está funcionando: leemos cada mensaje y te respondemos.
              </DialogDescription>
            </DialogHeader>

            <div role="radiogroup" aria-label="Tipo de mensaje" className="grid grid-cols-3 gap-2">
              {TIPOS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={tipo === value}
                  onClick={() => setTipo(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    tipo === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="soporte-asunto">Asunto</Label>
              <Input
                id="soporte-asunto"
                value={asunto}
                maxLength={MAX_ASUNTO}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder={PLACEHOLDERS[tipo].asunto}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="soporte-cuerpo">Mensaje</Label>
              <Textarea
                id="soporte-cuerpo"
                value={cuerpo}
                onChange={(e) => setCuerpo(e.target.value)}
                placeholder={PLACEHOLDERS[tipo].cuerpo}
                className="min-h-32"
                required
              />
              {tipo === "PROBLEMA" && (
                <p className="text-xs text-muted-foreground">
                  Junto con tu mensaje nos llega desde qué pantalla escribiste ({pathname}) y tu navegador.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={enviando || asunto.trim().length < 3 || !cuerpo.trim()}>
                {enviando && <Loader2 className="size-4 animate-spin" />}
                Enviar mensaje
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
