"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";

export function RestablecerForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmacion) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo guardar la contraseña.");
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
        <CardTitle className="text-xl">
          {listo ? "Contraseña actualizada" : "Elegí tu contraseña nueva"}
        </CardTitle>
        {!listo && (
          <p className="text-sm text-muted-foreground">
            Al guardarla se cierran las sesiones abiertas en otros dispositivos.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {listo ? (
          <div className="flex flex-col gap-4 text-center">
            <CircleCheck className="mx-auto size-10 text-primary" aria-hidden />
            <p className="text-sm">Ya podés ingresar con tu contraseña nueva.</p>
            <Button nativeButton={false} render={<Link href="/login" />}>
              Ingresar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña nueva</Label>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmacion">Repetí la contraseña</Label>
              <PasswordInput
                id="confirmacion"
                autoComplete="new-password"
                value={confirmacion}
                onChange={(event) => setConfirmacion(event.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
