import Link from "next/link";
import { Semio360Mark, Semio360Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/#beneficios", label: "Beneficios" },
  { href: "/#planes", label: "Planes" },
  { href: "/#compliance", label: "Ley 26.529" },
  { href: "/#contacto", label: "Contacto" },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Semio360Mark className="size-4.5" />
            </span>
            <Semio360Wordmark className="text-lg tracking-tight" />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              Iniciar sesión
            </Button>
            <Button size="sm" nativeButton={false} render={<Link href="/signup" />}>
              Registrate gratis
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Semio360Mark className="size-5 text-primary" />
            <span>Semio360 · Tu consultorio, en órbita.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>semio360.com</span>
            <span>semio360.com.ar</span>
            <a href="mailto:hola@semio360.com" className="hover:text-foreground">
              hola@semio360.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
