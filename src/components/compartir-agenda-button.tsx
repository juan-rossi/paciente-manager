"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppShareHref } from "@/lib/recordatorio-mensaje";

type Props = {
  url: string;
  nombreMedico: string;
  lugarNombre?: string | null;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
};

// Comparte el link público de reserva. En móvil abre el selector nativo
// (todas las redes instaladas); donde no hay Web Share API (escritorio) cae
// a WhatsApp, que es el canal más usado para pasar el link a pacientes.
export function CompartirAgendaButton({
  url,
  nombreMedico,
  lugarNombre,
  variant = "outline",
  size = "sm",
  className,
}: Props) {
  const text = `Sacá turno online con ${nombreMedico}${lugarNombre ? ` en ${lugarNombre}` : ""}:`;

  async function handleClick() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Turnos online", text, url });
      } catch {
        // El usuario cerró el selector (AbortError) -- no es un error.
      }
      return;
    }
    window.open(buildWhatsAppShareHref(`${text} ${url}`), "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" size={size} variant={variant} className={className} onClick={handleClick}>
      <Share2 className="size-4" />
      Compartir
    </Button>
  );
}
