"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Copia el link de la sala del paciente (`/t/{codigo}/sala`). El código se
// genera recién la primera vez que se pide (ver GET /api/turnos/[id]/sala).
export function CopiarLinkSala({ turnoId, className }: { turnoId: string; className?: string }) {
  const [estado, setEstado] = useState<"idle" | "cargando" | "copiado" | "error">("idle");

  async function copiar() {
    setEstado("cargando");
    try {
      const response = await fetch(`/api/turnos/${turnoId}/sala`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.link) throw new Error();
      const link = /^https?:\/\//.test(data.link) ? data.link : `https://${data.link}`;
      await navigator.clipboard.writeText(link);
      setEstado("copiado");
      setTimeout(() => setEstado("idle"), 2000);
    } catch {
      setEstado("error");
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant="outline" size="sm" onClick={copiar} disabled={estado === "cargando"}>
        {estado === "cargando" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : estado === "copiado" ? (
          <Check className="size-4" />
        ) : (
          <Copy className="size-4" />
        )}
        {estado === "copiado" ? "Link copiado" : "Copiar link de la sala"}
      </Button>
      {estado === "error" && <p className="mt-1 text-xs text-destructive">No se pudo copiar el link.</p>}
    </div>
  );
}
