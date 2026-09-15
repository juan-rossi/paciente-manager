"use client";

import { FormEvent, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";

export function OnboardingForm({ initialApellido }: { initialApellido: string }) {
  const { update } = useSession();
  const [apellido, setApellido] = useState(initialApellido);
  const [nroMatricula, setNroMatricula] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apellido, nroMatricula }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar los datos.");
        return;
      }

      // Sin esto, la cookie de sesión sigue diciendo "perfil incompleto" y
      // el middleware nos manda de vuelta acá apenas lleguemos a /dashboard.
      // OJO: `update()` sin argumentos hace un GET (no dispara `trigger:
      // "update"` en el callback jwt) -- hay que pasarle algo, aunque sea
      // un objeto vacío, para que next-auth haga el POST que sí lo dispara.
      await update({});

      // Navegación completa (no router.replace): el router cache de
      // App Router ya tiene cacheada la entrada de /dashboard con el
      // redirect viejo a /onboarding (de antes de completar el perfil), y
      // una navegación client-side la reutiliza en vez de pedirle al
      // servidor de nuevo, devolviendo al usuario a /onboarding en loop.
      window.location.href = "/dashboard";
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
        <CardTitle className="text-xl">Un último paso</CardTitle>
        <p className="text-sm text-muted-foreground">
          Google no nos da tu número de matrícula — completalo para empezar a usar Semio360.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Guardando..." : "Continuar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
