"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// El autor contesta dentro de su ticket (/soporte/[id]).
export function ResponderTicketForm({ ticketId, cerrado }: { ticketId: string; cerrado: boolean }) {
  const router = useRouter();
  const [cuerpo, setCuerpo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const response = await fetch(`/api/soporte/${ticketId}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cuerpo }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo enviar el mensaje.");
        return;
      }
      setCuerpo("");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2.5">
      <label htmlFor="soporte-respuesta" className="text-sm font-medium">
        Responder
      </label>
      <Textarea
        id="soporte-respuesta"
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        placeholder="Escribí tu respuesta…"
        className="min-h-24 bg-card"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {cerrado ? "Si nos escribís, volvemos a abrir la conversación." : "Te avisamos cuando respondamos."}
        </p>
        <Button type="submit" disabled={enviando || !cuerpo.trim()}>
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Enviar
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
