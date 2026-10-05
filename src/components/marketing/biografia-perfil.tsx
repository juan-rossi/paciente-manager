"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const MAX_PALABRAS = 90;

// Biografía del perfil público: si supera MAX_PALABRAS se corta con elipsis y
// aparece "Ver más", que abre el texto completo en un modal (pantalla completa
// en mobile, ancho del contenedor principal en escritorio).
export function BiografiaPerfil({ biografia, titulo }: { biografia: string; titulo: string }) {
  const [abierto, setAbierto] = useState(false);
  const palabras = biografia.trim().split(/\s+/);
  const larga = palabras.length > MAX_PALABRAS;
  const resumen = larga ? `${palabras.slice(0, MAX_PALABRAS).join(" ")}…` : biografia;

  return (
    <div>
      <h2 className="font-heading text-sm font-bold">Sobre mí</h2>
      <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">{resumen}</p>
      {larga && (
        <>
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="mt-2 text-xs font-semibold text-primary hover:underline"
          >
            Ver más
          </button>
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogContent
              className="top-0 left-0 flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-4 rounded-none p-5 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85dvh] sm:w-[min(70rem,calc(100vw-2rem))] sm:max-w-none sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-8"
            >
              <DialogTitle className="pr-8 text-lg font-bold">Sobre {titulo}</DialogTitle>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{biografia}</p>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
