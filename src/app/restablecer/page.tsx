import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";
import { tokenRestablecerValido } from "@/lib/password-reset";
import { RestablecerForm } from "./restablecer-form";

// El token viaja en la URL: `no-referrer` evita que se filtre en el header
// Referer si desde acá se navega a otro sitio.
export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string }> };

export default async function RestablecerPage({ searchParams }: Props) {
  const { token } = await searchParams;
  // Se valida antes de mostrar el formulario para no hacerle escribir la
  // contraseña nueva a alguien con un link vencido. El POST la vuelve a
  // validar igual (el token puede vencer mientras tiene la página abierta).
  const valido = typeof token === "string" && token !== "" && (await tokenRestablecerValido(token));

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent)",
        }}
      />
      {valido ? (
        <RestablecerForm token={token} />
      ) : (
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center justify-items-center text-center">
            <Link href="/" className="mb-1">
              <Semio360Mark className="size-11" />
            </Link>
            <CardTitle className="text-xl">El link ya no es válido</CardTitle>
            <p className="text-sm text-muted-foreground">
              Venció, ya se usó o se pidió uno más nuevo. Pedí otro link para elegir tu contraseña.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button nativeButton={false} render={<Link href="/recuperar" />}>
              Pedir un link nuevo
            </Button>
            <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
              Volver a ingresar
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
