import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// Franja propia en el color secundario de la marca (celeste, no el indigo de
// los CTAs para médicos) -- separa a propósito las dos audiencias del sitio:
// el resto del home le habla al médico que se registra, esta franja le
// habla al paciente que busca un médico.
export function DirectorioBanner() {
  return (
    <section className="border-y border-border/60 bg-brand-secondary/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">
        <div className="flex items-center gap-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-secondary text-white">
            <Search className="size-4.5" />
          </span>
          <div>
            <p className="font-heading text-[15px] font-bold">
              ¿Sos paciente y buscás un médico de confianza?
            </p>
            <p className="text-[13.5px] text-muted-foreground">
              Explorá el directorio público de Semio360, filtrá por especialidad y ciudad.
            </p>
          </div>
        </div>
        {/* <a> nativo a propósito, no next/link -- ver el comentario en
            site-header.tsx sobre el conflicto de ScrollStory (GSAP
            ScrollTrigger con pin) con una transición del lado del cliente. */}
        <Button
          variant="outline"
          className="shrink-0 border-brand-secondary text-brand-secondary hover:bg-brand-secondary/10"
          nativeButton={false}
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          render={<a href="/directorio" />}
        >
          Ver directorio
          <ArrowRight className="size-4" data-icon="inline-end" />
        </Button>
      </div>
    </section>
  );
}
