"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";
import { GoogleIcon } from "@/components/google-icon";
import { destinoInterno } from "@/lib/redirect-seguro";
import { TurnstileWidget } from "@/components/marketing/turnstile-widget";

// El motivo le llega por mail al suspender (ver `src/lib/sancion-email.ts`).
const CUENTA_SUSPENDIDA =
  "Tu cuenta está suspendida. Te enviamos un mail con el motivo. Si creés que es un error, escribinos a contacto@semio360.com.";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Esa cuenta no está asociada a ningún usuario de Semio360.",
  Suspendida: CUENTA_SUSPENDIDA,
  // Ver el callback `signIn` en src/auth.ts.
  EmailNoVerificado:
    "Tu cuenta de Google no tiene el email verificado. Verificalo en Google o ingresá con tu email y contraseña.",
};

// Avisos informativos (no errores) que otra pantalla deja al mandar acá.
const AVISOS: Record<string, string> = {
  "password-cambiada":
    "Cambiaste tu contraseña y cerramos todas tus sesiones. Ingresá de nuevo con la contraseña nueva.",
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
  const [isNavigating, startTransition] = useTransition();
  // Tras varios intentos fallidos con un email, el servidor pide Turnstile
  // (`captcha_required`, ver `loginRequiereVerificacion`). El token es de un
  // solo uso: después de cada intento se remonta el widget para uno nuevo.
  const [requiereVerificacion, setRequiereVerificacion] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

  const aviso = AVISOS[searchParams.get("aviso") ?? ""] ?? null;

  function destinationAfterLogin() {
    // Solo rutas de nuestro sitio (ver `destinoInterno`: `/\evil.com` pasaba
    // el chequeo anterior y llevaba a otro sitio después de un login real).
    const destino = destinoInterno(searchParams.get("from"), window.location.origin);
    // No "/": ahí se pinta el layout de marketing vacío mientras la home
    // redirige. `/dashboard` lo resuelve el proxy según el rol (secretaria →
    // /turnos, admin → /admin, perfil incompleto → /onboarding).
    return destino && destino !== "/" ? destino : "/dashboard";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (requiereVerificacion && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Completá la verificación para continuar.");
      return;
    }
    setLoading(true);

    try {
      const response = await signIn("credentials", {
        email,
        password,
        turnstileToken,
        redirect: false,
      });

      if (!response || response.error) {
        if (response?.code === "captcha_required") {
          setRequiereVerificacion(true);
        }
        // El token ya se usó (o no había): uno nuevo para el próximo intento.
        setTurnstileToken("");
        setTurnstileKey((k) => k + 1);
        setError(
          response?.code === "rate_limited"
            ? "Demasiados intentos. Esperá unos minutos o restablecé tu contraseña."
            : response?.code === "suspended"
              ? CUENTA_SUSPENDIDA
              : response?.code === "captcha_required"
                ? "Por seguridad, completá la verificación y volvé a intentar."
                : "Email o contraseña incorrectos."
        );
        return;
      }

      // La navegación renderiza el layout de la app en el servidor antes de
      // pintar nada: dentro de una transición, `isNavigating` mantiene el
      // botón en "Ingresando..." hasta que el dashboard está listo, en vez de
      // volver a "Ingresar" y dejar la pantalla congelada.
      startTransition(() => {
        router.replace(destinationAfterLogin());
        router.refresh();
      });
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || isNavigating;

  function handleGoogleSignIn() {
    setError(null);
    void signIn("google", { redirectTo: destinationAfterLogin() });
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center justify-items-center text-center">
        <Link href="/" className="mb-1">
          <Semio360Mark className="size-11" />
        </Link>
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href={email.trim() ? `/recuperar?email=${encodeURIComponent(email.trim())}` : "/recuperar"}
                className="text-xs font-medium text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {requiereVerificacion && (
            <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} />
          )}
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            aviso && <p className="text-sm text-muted-foreground">{aviso}</p>
          )}
          <Button type="submit" disabled={busy} className="mt-2">
            {busy ? "Ingresando..." : "Ingresar"}
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
