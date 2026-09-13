"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";
import { GoogleIcon } from "@/components/google-icon";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Esa cuenta no está asociada a ningún usuario de Semio360.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    const oauthError = searchParams.get("error");
    if (!oauthError) return null;
    return OAUTH_ERROR_MESSAGES[oauthError] ?? "No se pudo iniciar sesión.";
  });
  const [loading, setLoading] = useState(false);

  function destinationAfterLogin() {
    const from = searchParams.get("from");
    return from && from.startsWith("/") ? from : "/";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!response || response.error) {
        setError("Email o contraseña incorrectos.");
        return;
      }

      router.replace(destinationAfterLogin());
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    setError(null);
    void signIn("google", { redirectTo: destinationAfterLogin() });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center justify-items-center text-center">
        <span className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Semio360Mark className="size-5.5" />
        </span>
        <CardTitle className="text-xl">Semio360</CardTitle>
        <p className="text-sm text-muted-foreground">
          Ingresá con tu usuario para acceder a las historias clínicas.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={handleGoogleSignIn}>
            <GoogleIcon />
            Continuar con Google
          </Button>
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          o con tu usuario
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Registrate gratis
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
