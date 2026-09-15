import { SectionHeading } from "./section-heading";
import { OrbitDiagram } from "./orbit-diagram";

export function ConceptOrbit() {
  return (
    <section id="producto" className="overflow-x-hidden border-t border-border/60 py-20 sm:py-28">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-14 px-4">
        <SectionHeading
          kicker="El concepto"
          title="Todo conectado. Todo en un mismo lugar."
          description="Semio360 reúne cada parte de tu consultorio en una sola plataforma, en vez de repartirla entre planillas, apps y papeles sueltos."
        />
        <OrbitDiagram />
      </div>
    </section>
  );
}
