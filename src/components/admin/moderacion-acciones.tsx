"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Aprobar/Rechazar de una revisión en /admin/moderacion.
export function ModeracionAcciones({ id, updatedAt }: { id: string; updatedAt: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState<"APROBAR" | "RECHAZAR" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decidir(decision: "APROBAR" | "RECHAZAR") {
    setError(null);
    setEnviando(decision);
    try {
      const response = await fetch(`/api/admin/moderacion/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, updatedAt }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la decisión.");
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={enviando !== null}
          onClick={() => decidir("RECHAZAR")}
        >
          {enviando === "RECHAZAR" ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          Rechazar
        </Button>
        <Button type="button" disabled={enviando !== null} onClick={() => decidir("APROBAR")}>
          {enviando === "APROBAR" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Aprobar y publicar
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
