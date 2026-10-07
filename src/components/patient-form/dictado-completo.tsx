"use client";

import { ChevronDown, FileAudio, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  dictado: string | null | undefined;
  // Solo en el formulario: vuelve a poner el dictado en el campo, descartando
  // el resumen. En las vistas de solo lectura no se pasa.
  onRestaurar?: () => void;
};

// El texto original dictado, guardado junto al resumen de IA que quedó como
// contenido "oficial" del campo -- plegado por defecto para no competir con él.
export function DictadoCompleto({ dictado, onRestaurar }: Props) {
  if (!dictado?.trim()) return null;

  return (
    <details className="group rounded-md border border-border/60 bg-muted/30 text-sm">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-3 py-2 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <FileAudio className="size-3.5" />
          Ver dictado completo
        </span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-3 border-t border-border/60 px-3 py-3">
        <p className="whitespace-pre-wrap text-muted-foreground">{dictado}</p>
        {onRestaurar && (
          <div>
            <Button type="button" variant="outline" size="sm" onClick={onRestaurar}>
              <Undo2 className="size-3.5" />
              Usar el dictado en lugar del resumen
            </Button>
          </div>
        )}
      </div>
    </details>
  );
}
