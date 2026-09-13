import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Lock,
  Mic,
  ShieldCheck,
} from "lucide-react";
import { getCurrentUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Semio360Mark } from "@/components/brand/logo";
import { PLAN_FEATURES } from "@/lib/plan";

export const dynamic = "force-dynamic";

const BENEFICIOS = [
  {
    icon: ClipboardList,
    titulo: "Todo en un lugar",
    texto: "Turnos, ficha clínica y evolución del paciente, sin saltar entre planillas, apps y papeles sueltos.",
  },
  {
    icon: Mic,
    titulo: "Habla, no tipees",
    texto: "Dictás la evolución y se transcribe sola con el transcriptor local -- nada de tipear con el paciente esperando.",
  },
  {
    icon: CalendarDays,
    titulo: "Vivo en la nube",
    texto: "Accedé desde cualquier consultorio o dispositivo, sin instalar ni mantener nada.",
  },
];

const TESTIMONIOS = [
  {
    nombre: "Dra. M. G.",
    rol: "Clínica Médica",
    texto: "Dejé de perder tiempo buscando la ficha de cada paciente. Ahora está todo en un mismo lugar, y dictar la evolución me ahorra un rato largo por consulta.",
  },
  {
    nombre: "Dr. F. T.",
    rol: "Consultorio particular",
    texto: "Mi secretaria maneja los turnos sola, sin que yo tenga que estar encima. Los recordatorios por WhatsApp bajaron muchísimo las ausencias.",
  },
  {
    nombre: "Dra. M. V.",
    rol: "Medicina General",
    texto: "Empecé con la prueba gratis para ver si valía la pena migrar desde Excel, y a la semana ya no me imaginaba volver atrás.",
  },
];

export default async function MarketingHomePage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "DOCTOR" ? "/dashboard" : "/turnos");
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent)",
          }}
        />
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:py-28">
          <Semio360Mark className="size-16 text-primary" />
          <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Tu consultorio, en órbita.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground text-balance">
            Turnos, historia clínica y evolución del paciente en un solo lugar. Dictás la
            consulta y se transcribe sola. Sin instalar nada.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" nativeButton={false} render={<Link href="/signup" />}>
              Probá 3 meses gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={<Link href="#planes" />}
            >
              Ver planes
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Sin tarjeta de crédito. Cancelás cuando quieras.</p>
        </div>
      </section>

      {/* Beneficios */}
      <section id="beneficios" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Beneficios</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              Pensado para el consultorio real
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {BENEFICIOS.map((b) => (
              <Card key={b.titulo}>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <b.icon className="size-5" />
                  </span>
                  <h3 className="text-lg font-semibold">{b.titulo}</h3>
                  <p className="text-sm text-muted-foreground">{b.texto}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planes */}
      <section id="planes" className="border-t border-border/60">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Planes</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              Empezá gratis, subí cuando lo necesites
            </h2>
            <p className="mt-3 text-muted-foreground">
              Los dos planes incluyen 3 meses de prueba gratis, sin tarjeta.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <div>
                  <h3 className="text-xl font-bold">Básica</h3>
                  <p className="text-sm text-muted-foreground">Para empezar a ordenar el consultorio.</p>
                </div>
                <ul className="flex flex-col gap-2 text-sm">
                  {PLAN_FEATURES.BASICA.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="outline"
                  className="mt-2"
                  nativeButton={false}
                  render={<Link href="/signup" />}
                >
                  Empezar gratis
                </Button>
              </CardContent>
            </Card>
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">Premium</h3>
                  <Badge>Recomendado</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Para consultorios que quieren automatizar al máximo.
                </p>
                <ul className="flex flex-col gap-2 text-sm">
                  {PLAN_FEATURES.PREMIUM.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-2" nativeButton={false} render={<Link href="/signup" />}>
                  Empezar gratis
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section id="compliance" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <div className="mb-8 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Confianza y compliance</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              Cumplimos con la Ley 26.529
            </h2>
            <p className="mt-3 text-muted-foreground">
              La ley argentina de Derechos del Paciente, Historia Clínica y Consentimiento
              Informado. La tomamos en serio desde el diseño del producto.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <ShieldCheck className="size-8 text-primary" />
              <h3 className="font-semibold">Confidencialidad</h3>
              <p className="text-sm text-muted-foreground">
                Cada médico ve únicamente los datos de sus propios pacientes. Las secretarias no
                acceden a información clínica sensible.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <Lock className="size-8 text-primary" />
              <h3 className="font-semibold">Acceso controlado</h3>
              <p className="text-sm text-muted-foreground">
                Login con contraseña o Google, roles diferenciados por usuario y datos alojados en
                la nube con acceso restringido.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <ClipboardList className="size-8 text-primary" />
              <h3 className="font-semibold">Historia clínica digital</h3>
              <p className="text-sm text-muted-foreground">
                Toda la evolución del paciente queda registrada de forma cronológica y
                centralizada, tal como exige la ley.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Testimonios</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
              Médicos que ya lo usan
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIOS.map((t) => (
              <Card key={t.nombre}>
                <CardContent className="flex flex-col gap-3 pt-6">
                  <p className="text-sm text-muted-foreground">&ldquo;{t.texto}&rdquo;</p>
                  <div>
                    <p className="text-sm font-semibold">{t.nombre}</p>
                    <p className="text-xs text-muted-foreground">{t.rol}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">¿Tenés dudas?</h2>
          <p className="text-muted-foreground">
            Escribinos y te ayudamos a decidir qué plan te conviene.
          </p>
          <Button
            size="lg"
            nativeButton={false}
            render={<a href="mailto:hola@semio360.com" />}
          >
            hola@semio360.com
          </Button>
        </div>
      </section>
    </>
  );
}
