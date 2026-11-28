import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Semio360Mark } from "@/components/brand/logo";
import { verificarTokenBajaEngagement } from "@/lib/engagement-baja";

// La firma viaja en la URL: `no-referrer` evita que se filtre en el Referer.
export const metadata: Metadata = {
  title: "Mails de Semio360",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ u?: string; t?: string; estado?: string }> };

// Desde el link "No quiero recibir más estos mails" de los mails de
// activación. El GET solo muestra el botón: los antivirus de los mails abren
// los links solos, así que la baja se confirma con un POST.
export default async function BajaMailsPage({ searchParams }: Props) {
  const { u = "", t = "", estado } = await searchParams;
  const valido = verificarTokenBajaEngagement(u, t);
  const accion = `/api/mails/baja?${new URLSearchParams({ u, t })}`;

  let titulo: string;
  let detalle: string;
  let form: { accion: "baja" | "alta"; label: string; variant: "default" | "outline" } | null = null;
  if (!valido) {
    titulo = "El link no es válido";
    detalle = "Puede que esté incompleto. Abrí de nuevo el link desde el último mail que te mandamos.";
  } else if (estado === "baja") {
    titulo = "Listo, no te mandamos más estos mails";
    detalle =
      "Vas a seguir recibiendo solo los mails necesarios de tu cuenta, como los de pagos o seguridad.";
    form = { accion: "alta", label: "Me equivoqué, quiero seguir recibiéndolos", variant: "outline" };
  } else if (estado === "alta") {
    titulo = "Vas a seguir recibiendo nuestros mails";
    detalle = "Te vamos a escribir solo con consejos para sacarle provecho a Semio360.";
  } else {
    titulo = "¿Dejar de recibir estos mails?";
    detalle =
      "Son los mails con consejos para arrancar con Semio360 y los avisos de fin de tu prueba. Los de pagos y seguridad de tu cuenta van a seguir llegando.";
    form = { accion: "baja", label: "Sí, no quiero recibirlos más", variant: "default" };
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 12%, transparent), transparent)",
        }}
      />
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center justify-items-center text-center">
          <Link href="/" className="mb-1">
            <Semio360Mark className="size-11" />
          </Link>
          <CardTitle className="text-xl text-balance">{titulo}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <p className="text-center text-sm text-pretty text-muted-foreground">{detalle}</p>
          {form ? (
            <form method="post" action={accion}>
              <input type="hidden" name="origen" value="pagina" />
              <input type="hidden" name="accion" value={form.accion} />
              <Button type="submit" variant={form.variant} className="w-full">
                {form.label}
              </Button>
            </form>
          ) : (
            <Button className="w-full" nativeButton={false} render={<Link href="/login" />}>
              Ir a Semio360
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
