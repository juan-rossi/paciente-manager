"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";
import { TurnstileWidget } from "@/components/marketing/turnstile-widget";

export function RecuperarForm({ emailInicial }: { emailInicial: string }) {
  const [email, setEmail] = useState(emailInicial);
  const [turnstileToken, setTurnstileToken] = useState("");
  // Cada token de Turnstile sirve una sola vez: tras un intento fallido se
  // remonta el widget (cambiando su `key`) para que genere uno nuevo.
  const [turnstileKey, setTurnstileKey] = useState(0);

  function renovarTurnstile() {
    setTurnstileToken("");
    setTurnstileKey((k) => k + 1);
  }
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enviadoA, setEnviadoA] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Completá la verificación antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "No se pudo enviar el pedido.");
        renovarTurnstile();
        return;
      }
      setEnviadoA(email.trim());
    } catch {
      setError("No se pudo conectar con el servidor.");
      renovarTurnstile();
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
          {enviadoA ? "Revisá tu correo" : "Recuperar contraseña"}
        </CardTitle>
        {!enviadoA && (
          <p className="text-sm text-muted-foreground">
            Ingresá el email de tu cuenta y te mandamos un link para elegir una contraseña nueva.
          </p>
        )}
      </CardHeader>
      <CardContent>
        {enviadoA ? (
          <div className="flex flex-col gap-4 text-center">
            <MailCheck className="mx-auto size-10 text-primary" aria-hidden />
            <p className="text-sm">
              Si hay una cuenta registrada con <span className="font-medium">{enviadoA}</span>, en
              unos minutos te llega un mail con el link.
            </p>
            <p className="text-sm text-muted-foreground">
              El link vence en 1 hora. Si no lo ves, revisá la carpeta de spam o promociones.
            </p>
            <Button variant="outline" render={<Link href="/login" />} nativeButton={false}>
              Volver a ingresar
            </Button>
          </div>
        ) : (
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
                autoFocus
              />
            </div>
            <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? "Enviando..." : "Enviarme el link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Volver a ingresar
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
