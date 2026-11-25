"use client";

import { useState } from "react";
import { Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  // Endpoint que devuelve `{ url }` (sala + token) -- el del paciente o el
  // del médico. Se pide recién al tocar el botón: así abrir la página (o la
  // vista previa de WhatsApp) nunca crea la sala ni un token.
  endpoint: string;
  textoBoton?: string;
  // Algo que se muestra arriba de la videollamada (p.ej. el link a la HC).
  barraSuperior?: React.ReactNode;
};

export function SalaVideo({ endpoint, textoBoton = "Entrar a la consulta", barraSuperior }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar() {
    setCargando(true);
    setError(null);
    try {
      const response = await fetch(endpoint, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        setError(data.error ?? "No se pudo abrir la sala. Probá de nuevo.");
        return;
      }
      setUrl(data.url);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  if (url) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
        {barraSuperior && (
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-sm text-white">
            {barraSuperior}
          </div>
        )}
        <iframe
          src={url}
          title="Videollamada"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          className="w-full flex-1 border-0"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" className="w-full" onClick={entrar} disabled={cargando}>
        {cargando ? <Loader2 className="size-4 animate-spin" /> : <Video className="size-4" />}
        {cargando ? "Abriendo la sala..." : textoBoton}
      </Button>
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      <p className="text-center text-xs text-muted-foreground">
        Cuando el navegador lo pida, permití el acceso a la cámara y al micrófono.
      </p>
    </div>
  );
}
