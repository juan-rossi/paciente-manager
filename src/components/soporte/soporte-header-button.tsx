"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bug, Lightbulb, MessageSquareHeart } from "lucide-react";
import type { TicketEstado } from "@/generated/prisma/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EstadoTicketPill } from "@/components/soporte/estado-ticket-pill";
import { NuevoTicketDialog, type TipoTicket } from "@/components/soporte/nuevo-ticket-dialog";
import { cn } from "@/lib/utils";

export type TicketResumen = {
  id: string;
  asunto: string;
  estado: TicketEstado;
  noLeido: boolean;
  fechaTexto: string;
};

type Props = {
  tickets: TicketResumen[];
  noLeidos: number;
};

// Ícono de "Sugerencias y soporte" del header de la app: avisa cuando el
// equipo respondió y abre el formulario para escribirnos.
export function SoporteHeaderButton({ tickets, noLeidos }: Props) {
  const [open, setOpen] = useState(false);
  const [dialogTipo, setDialogTipo] = useState<TipoTicket | null>(null);
  const pathname = usePathname();

  // El layout no se remonta al navegar: se cierra al tocar un link.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  function abrirFormulario(tipo: TipoTicket) {
    setOpen(false);
    setDialogTipo(tipo);
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-label={
            noLeidos > 0 ? `Sugerencias y soporte (${noLeidos} respuestas nuevas)` : "Sugerencias y soporte"
          }
          title="Sugerencias y soporte"
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "relative")}
        >
          <MessageSquareHeart className="size-4.5" />
          {noLeidos > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white tabular-nums">
              {noLeidos > 9 ? "9+" : noLeidos}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 gap-0 p-0">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
            <span className="font-heading text-sm font-semibold">Sugerencias y soporte</span>
            {tickets.length > 0 && (
              <Link href="/soporte" className="text-xs font-medium text-primary hover:underline">
                Ver todos
              </Link>
            )}
          </div>

          {tickets.length === 0 ? (
            <p className="px-3.5 py-4 text-sm leading-relaxed text-muted-foreground">
              Que estés conforme con Semio 360 es lo más importante para nosotros. Contanos qué mejorarías o avisanos
              si algo no funciona: leemos cada mensaje.
            </p>
          ) : (
            <ul className="flex flex-col">
              {tickets.map((t) => (
                <li key={t.id} className="border-b border-border last:border-b-0">
                  <Link
                    href={`/soporte/${t.id}`}
                    className={cn(
                      "flex flex-col gap-1 px-3.5 py-2.5 transition-colors hover:bg-muted",
                      t.noLeido && "bg-primary/5"
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="line-clamp-1 text-sm font-medium">{t.asunto}</span>
                      <EstadoTicketPill estado={t.estado} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.noLeido && <span className="font-semibold text-primary">Te respondimos · </span>}
                      {t.fechaTexto}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-border p-2.5">
            <Button size="sm" onClick={() => abrirFormulario("SUGERENCIA")}>
              <Lightbulb />
              Sugerir mejora
            </Button>
            <Button size="sm" variant="outline" onClick={() => abrirFormulario("PROBLEMA")}>
              <Bug />
              Reportar problema
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <NuevoTicketDialog
        open={dialogTipo !== null}
        onOpenChange={(o) => !o && setDialogTipo(null)}
        tipoInicial={dialogTipo ?? "SUGERENCIA"}
      />
    </>
  );
}
