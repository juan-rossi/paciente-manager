"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Invitacion = { id: string; nombreMedico: string };

// Invitaciones de médicos que sumaron a esta secretaria (ver POST
// /api/users). Hasta que acepte, la asignación no le da acceso a nada.
export function InvitacionesSecretaria({ invitaciones }: { invitaciones: Invitacion[] }) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function responder(id: string, accion: "aceptar" | "rechazar") {
    setEnCurso(id);
    setError(null);
    try {
      const response = await fetch(`/api/account/invitaciones/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudo responder la invitación.");
        return;
      }
      router.refresh();
    } finally {
      setEnCurso(null);
    }
  }

  if (invitaciones.length === 0) return null;

  return (
    <div className="border-b border-border bg-brand-accent/5 print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3">
        {invitaciones.map((inv) => (
          <div key={inv.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <UserPlus className="mt-0.5 size-4 shrink-0 text-brand-accent" />
              <p className="text-sm">
                <strong>{inv.nombreMedico}</strong> te invitó a administrar su agenda.{" "}
                <span className="text-muted-foreground">Si no lo conocés, rechazala.</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={enCurso !== null}
                onClick={() => responder(inv.id, "rechazar")}
              >
                Rechazar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={enCurso !== null}
                onClick={() => responder(inv.id, "aceptar")}
              >
                {enCurso === inv.id ? "Guardando..." : "Aceptar"}
              </Button>
            </div>
          </div>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
