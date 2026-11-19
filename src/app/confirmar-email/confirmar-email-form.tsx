"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";

// Confirmar es un botón (POST), no el link del mail: los antivirus de correo
// abren los links y un GET que cambia algo se confirmaría solo.
export function ConfirmarEmailForm({ token, emailNuevo }: { token: string; emailNuevo: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);

  async function handleConfirmar() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/cuenta/email/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo confirmar el email.");
        return;
      }
      setListo(true);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center justify-items-center text-center">
        <Link href="/" className="mb-1">
          <Semio360Mark className="size-11" />
        </Link>
        <CardTitle className="text-xl">{listo ? "Email actualizado" : "Confirmá tu email nuevo"}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {listo ? (
            <>
              Desde ahora ingresás con <strong className="font-medium text-foreground">{emailNuevo}</strong>.
              Cerramos todas tus sesiones.
            </>
          ) : (
            <>
              Tu cuenta de Semio 360 va a usar{" "}
              <strong className="font-medium text-foreground">{emailNuevo}</strong> para ingresar y para recibir
              los avisos.
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {listo ? (
          <>
            <div className="flex justify-center text-primary">
              <CircleCheck className="size-10" />
            </div>
            {/* Por si en este navegador había una sesión abierta: ya no vale. */}
            <Button onClick={() => void signOut({ redirectTo: "/login?aviso=email-cambiado" })}>
              Ingresar con el email nuevo
            </Button>
          </>
        ) : (
          <>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleConfirmar} disabled={loading}>
              {loading ? "Confirmando..." : "Confirmar email"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
