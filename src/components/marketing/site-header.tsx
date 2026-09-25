"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { Semio360Mark, Semio360Wordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// `/#id` (con el `/` adelante) en vez de `#id` a secas -- las secciones que
// apuntan (Producto, Planes, Testimonios, FAQ) solo existen en el home. Un
// link `#id` a secas navega bien desde el home mismo, pero desde cualquier
// otra ruta (ej. /directorio) solo cambia el hash de ESA página sin mover a
// ningún lado, porque ahí no hay ningún elemento con ese id.
const NAV_LINKS = [
  { href: "/#producto", label: "Producto" },
  { href: "/#testimonios", label: "Testimonios" },
  { href: "/#planes", label: "Planes" },
  { href: "/#faq", label: "Preguntas frecuentes" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        scrolled
          ? "border-border/60 bg-background/75 shadow-sm backdrop-blur-lg"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Semio360Mark className="size-8" />
            <Semio360Wordmark className="h-5" />
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* <a> nativo a propósito, no <Link> -- ScrollStory usa GSAP
              ScrollTrigger con `pin: true`, que reestructura el DOM por su
              cuenta; una transición del lado del cliente hacia otra página
              del mismo layout puede desmontar esa sección a mitad de una
              carrera con el cleanup de GSAP y tirar un "removeChild" en
              React. Forzar una navegación completa evita la carrera. */}
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            nativeButton={false}
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            render={<a href="/directorio" />}
          >
            <Search className="size-3.5" data-icon="inline-start" />
            Directorio
          </Button>
          <span className="hidden h-5 w-px bg-border/60 sm:block" />
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
            nativeButton={false}
            render={<Link href="/login" />}
          >
            Iniciar sesión
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/signup" />}>
            Probar Semio360
          </Button>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              aria-label="Abrir menú"
              className="flex size-8 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
            >
              <Menu className="size-4" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <nav className="flex flex-col gap-1">
                {/* <a> nativo a propósito -- ver comentario junto al botón de escritorio. */}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a
                  href="/directorio"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Directorio
                </a>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
                >
                  Iniciar sesión
                </Link>
              </nav>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
