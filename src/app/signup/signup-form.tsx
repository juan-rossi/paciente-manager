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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Semio360Mark } from "@/components/brand/logo";
import { GoogleIcon } from "@/components/google-icon";
import {
  TITULO_CORTESIA_LABELS,
  TITULO_CORTESIA_OPTIONS,
  type TituloCortesia,
} from "@/lib/titulo-cortesia";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [nroMatricula, setNroMatricula] = useState("");
  const [tituloCortesia, setTituloCortesia] = useState<TituloCortesia | "">("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleGoogleSignUp() {
    setError(null);
    void signIn("google", { redirectTo: "/dashboard" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!tituloCortesia) {
      setError("Elegí un título.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nombre, apellido, nroMatricula, tituloCortesia, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se pudo crear la cuenta.");
        return;
      }

      const loginResponse = await signIn("credentials", { email, password, redirect: false });
      if (!loginResponse || loginResponse.error) {
        // La cuenta se creó bien; si el auto-login falla por algún motivo,
        // que entre a mano en vez de mostrar un error confuso.
        router.replace("/login");
        return;
      }

      router.replace("/dashboard");
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
        <Semio360Mark className="mb-1 size-11" />
        <CardTitle className="text-xl">Creá tu cuenta en Semio360</CardTitle>
        <p className="text-sm text-muted-foreground">
          Probá el plan Básico gratis durante 3 meses, sin tarjeta.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={handleGoogleSignUp}>
            <GoogleIcon />
            Continuar con Google
          </Button>
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          o con tu email
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-[7.5rem_1fr] gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tituloCortesia">Título</Label>
              <Select
                value={tituloCortesia}
                onValueChange={(v) => setTituloCortesia(v as TituloCortesia)}
              >
                <SelectTrigger id="tituloCortesia" className="w-full">
                  <SelectValue>
                    {(v: TituloCortesia | "") => (v ? TITULO_CORTESIA_LABELS[v] : "Elegir...")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TITULO_CORTESIA_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                autoComplete="given-name"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="apellido">Apellido</Label>
            <Input
              id="apellido"
              autoComplete="family-name"
              value={apellido}
              onChange={(event) => setApellido(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nroMatricula">Nro Matrícula</Label>
            <Input
              id="nroMatricula"
              value={nroMatricula}
              onChange={(event) => setNroMatricula(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
