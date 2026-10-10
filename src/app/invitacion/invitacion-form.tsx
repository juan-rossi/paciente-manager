"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";
import { GoogleIcon } from "@/components/google-icon";
import { INVITACION_COOKIE, INVITACION_COOKIE_MAX_AGE_SECONDS } from "@/lib/invitacion-secretaria-shared";

type Props = {
  token: string;
  nombreMedico: string;
  email: string;
  nombreInicial: string;
  // Ya tiene contraseña (asiste a otro médico): no se le ofrece elegir una
  // nueva, solo entrar con la que ya usa.
  tienePassword: boolean;
  // Volvió del login de Google con una cuenta distinta de la invitada.
  otraCuentaGoogle: boolean;
};

export function InvitacionForm({ token, nombreMedico, email, nombreInicial, tienePassword, otraCuentaGoogle }: Props) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreInicial);
  const [password, setPassword] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(
    otraCuentaGoogle ? `Entraste con una cuenta de Google distinta de ${email}. Usá esa cuenta o elegí una contraseña.` : null
  );
  const [loading, setLoading] = useState(false);

  function handleGoogle() {
    setError(null);
    // El callback de auth lee esta cookie para aceptar la invitación si la
    // cuenta de Google es la invitada (ver src/auth.ts).
    document.cookie = `${INVITACION_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${INVITACION_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
    void signIn("google", { redirectTo: "/turnos" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("Completá tu nombre.");
      return;
    }
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
      const response = await fetch("/api/invitacion/activar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nombre, password }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "No se pudo aceptar la invitación.");
        return;
      }

      const login = await signIn("credentials", { email, password, redirect: false });
      router.replace(!login || login.error ? "/login?from=/turnos" : "/turnos");
      router.refresh();
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
        <CardTitle className="text-xl">{nombreMedico} te invitó a Semio 360</CardTitle>
        <p className="text-sm text-muted-foreground">
          Vas a poder gestionar su agenda de turnos.{" "}
          {tienePassword ? "Ingresá con tu cuenta para aceptar." : "Creá tu acceso para empezar."}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-md bg-muted px-3 py-2 text-center text-sm">
          <span className="text-muted-foreground">Invitación para </span>
          <span className="font-medium break-all">{email}</span>
        </div>

        <Button type="button" variant="outline" onClick={handleGoogle}>
          <GoogleIcon />
          Continuar con Google
        </Button>

        {tienePassword ? (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />o
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button nativeButton={false} render={<Link href="/login?from=/turnos" />}>
              Ingresar con mi contraseña
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Una vez adentro, vas a ver la invitación para aceptarla.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              o elegí una contraseña
              <div className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nombre">Tu nombre</Label>
                <Input
                  id="nombre"
                  autoComplete="name"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  required
                />
              </div>
              {/* Para que el gestor de contraseñas la guarde con el email correcto. */}
              <input type="email" name="email" autoComplete="username" value={email} readOnly hidden />
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
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
              <Button type="submit" disabled={loading} className="mt-1">
                {loading ? "Guardando..." : "Aceptar invitación"}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
