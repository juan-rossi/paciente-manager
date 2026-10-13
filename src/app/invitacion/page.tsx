import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";
import { buscarInvitacion } from "@/lib/invitacion-secretaria";
import { InvitacionForm } from "./invitacion-form";

// El token viaja en la URL: `no-referrer` evita que se filtre en el header
// Referer si desde acá se navega a otro sitio.
export const metadata: Metadata = {
  title: "Invitación",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string; error?: string }> };

export default async function InvitacionPage({ searchParams }: Props) {
  const { token, error } = await searchParams;
  const invitacion = typeof token === "string" && token !== "" ? await buscarInvitacion(token) : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent)",
        }}
      />
      {invitacion && token ? (
        <InvitacionForm
          token={token}
          nombreMedico={invitacion.nombreMedico}
          email={invitacion.email}
          nombreInicial={invitacion.nombre}
          tienePassword={invitacion.tienePassword}
          otraCuentaGoogle={error === "otra-cuenta"}
        />
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center justify-items-center text-center">
            <Link href="/" className="mb-1">
              <Semio360Mark className="size-11" />
            </Link>
            <CardTitle className="text-xl">La invitación ya no es válida</CardTitle>
            <p className="text-sm text-muted-foreground">
              Venció, ya se aceptó o se envió una más nueva. Si ya tenés tu acceso, ingresá: las
              invitaciones pendientes aparecen adentro. Si no, pedile a quien te invitó que te la reenvíe.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button nativeButton={false} render={<Link href="/login?from=/turnos" />}>
              Ingresar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
