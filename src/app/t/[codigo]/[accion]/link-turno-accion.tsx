"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  codigo: string;
  accion: "si" | "no";
  yaConfirmado: boolean;
  puedeCancelar: boolean;
};

// El botón de la página del link: recién acá se confirma o cancela. Desde
// cada página hay un link chico a la otra acción, por si el paciente tocó
// la que no era.
export function LinkTurnoAccion({ codigo, accion, yaConfirmado, puedeCancelar }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<"si" | "no" | null>(accion === "si" && yaConfirmado ? "si" : null);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch(`/api/t/${codigo}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudo completar. Probá de nuevo.");
        return;
      }
      setListo(accion);
    } finally {
      setEnviando(false);
    }
  }

  if (listo === "si") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-emerald-600 text-white">
          <Check className="size-6" />
        </span>
        <div>
          <p className="font-semibold">¡Listo, te esperamos!</p>
          <p className="text-sm text-muted-foreground">Tu asistencia quedó confirmada.</p>
        </div>
        {puedeCancelar && (
          <Link href={`/t/${codigo}/no`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            ¿Al final no podés ir? Cancelá el turno
          </Link>
        )}
      </div>
    );
  }

  if (listo === "no") {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-destructive text-white">
          <X className="size-6" />
        </span>
        <div>
          <p className="font-semibold">Turno cancelado</p>
          <p className="text-sm text-muted-foreground">Gracias por avisar. El horario quedó libre para otro paciente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {accion === "si" ? (
        <Button size="lg" className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={enviar} disabled={enviando}>
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {enviando ? "Confirmando..." : "Confirmar asistencia"}
        </Button>
      ) : (
        <Button size="lg" variant="destructive" className="w-full" onClick={enviar} disabled={enviando}>
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
          {enviando ? "Cancelando..." : "Cancelar turno"}
        </Button>
      )}
      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      {accion === "si" && puedeCancelar && (
        <Link
          href={`/t/${codigo}/no`}
          className="text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          No puedo ir, quiero cancelar el turno
        </Link>
      )}
      {accion === "no" && (
        <Link
          href={`/t/${codigo}/si`}
          className="text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          Sí voy a ir, quiero confirmar
        </Link>
      )}
    </div>
  );
}
