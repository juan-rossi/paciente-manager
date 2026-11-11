"use client";

import { useState } from "react";
import { Bug, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NuevoTicketDialog, type TipoTicket } from "@/components/soporte/nuevo-ticket-dialog";
import { cn } from "@/lib/utils";

export function NuevoTicketBotones({ className }: { className?: string }) {
  const [tipo, setTipo] = useState<TipoTicket | null>(null);
  return (
    <>
      <div className={cn("flex flex-wrap gap-2", className)}>
        <Button onClick={() => setTipo("SUGERENCIA")}>
          <Lightbulb />
          Sugerir una mejora
        </Button>
        <Button variant="outline" onClick={() => setTipo("PROBLEMA")}>
          <Bug />
          Reportar un problema
        </Button>
      </div>
      <NuevoTicketDialog
        open={tipo !== null}
        onOpenChange={(o) => !o && setTipo(null)}
        tipoInicial={tipo ?? "SUGERENCIA"}
      />
    </>
  );
}
