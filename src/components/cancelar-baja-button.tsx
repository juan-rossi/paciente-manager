"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CancelarBajaButton() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelar() {
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch("/api/cuenta/baja", { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudo cancelar la baja.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button type="button" variant="ghost" size="sm" disabled={enviando} onClick={cancelar}>
        {enviando ? "Cancelando…" : "Me arrepentí: cancelar la baja"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
