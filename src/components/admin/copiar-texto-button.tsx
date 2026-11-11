"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

// Botón chico para copiar un dato (p.ej. el email en /admin/soporte).
export function CopiarTextoButton({ texto, className }: { texto: string; className?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso de portapapeles: el texto igual queda seleccionable.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={copiado ? "Copiado" : `Copiar ${texto}`}
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-md border border-border px-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className
      )}
    >
      {copiado ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}
