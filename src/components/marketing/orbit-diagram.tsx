import {
  CalendarDays,
  ClipboardSignature,
  FileText,
  MessageCircle,
  NotebookPen,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Semio360Mark } from "@/components/brand/logo";

type OrbitItem = { icon: LucideIcon; label: string };

// Las 6 funcionalidades reales que orbitan el isotipo -- todas existen en el
// producto (ver historia clínica, consentimientos, turnos, recordatorios).
const ITEMS: OrbitItem[] = [
  { icon: CalendarDays, label: "Turnos" },
  { icon: Users, label: "Pacientes" },
  { icon: NotebookPen, label: "Historia clínica" },
  { icon: FileText, label: "Evoluciones" },
  { icon: ClipboardSignature, label: "Consentimientos" },
  { icon: MessageCircle, label: "Recordatorios" },
];

export function OrbitDiagram() {
  const n = ITEMS.length;
  return (
    <div className="relative mx-auto size-[320px] [--orbit-radius:132px] sm:size-[420px] sm:[--orbit-radius:168px]">
      <div className="absolute inset-0 rounded-full border border-dashed border-border/70" />

      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card px-3.5 py-3 shadow-lg sm:px-5 sm:py-4">
          <Semio360Mark className="size-6 sm:size-8" />
          <span className="font-heading text-xs font-extrabold sm:text-sm">
            Semio<span className="text-primary">360</span>
          </span>
        </div>
      </div>

      <div className="animate-orbit absolute inset-0">
        {ITEMS.map((item) => {
          const angle = (360 / n) * ITEMS.indexOf(item);
          return (
            <div
              key={`line-${item.label}`}
              className="absolute top-1/2 left-1/2 h-px w-(--orbit-radius) origin-left bg-gradient-to-r from-primary/25 to-transparent"
              style={{ transform: `rotate(${angle}deg)` }}
            />
          );
        })}
        {ITEMS.map((item, i) => {
          const angle = (360 / n) * i;
          return (
            <div
              key={item.label}
              className="absolute top-1/2 left-1/2 size-0"
              style={{ transform: `rotate(${angle}deg) translateX(var(--orbit-radius))` }}
            >
              {/* La órbita comparte una sola animación de reversa para todos los
                  items -- eso solo cancela la rotación del wrapper en el tiempo,
                  no el ángulo fijo de este item (`angle`), que si no se cancela acá
                  primero deja la etiqueta permanentemente inclinada. */}
              <div style={{ transform: `rotate(${-angle}deg)` }}>
                <div className="animate-orbit-reverse">
                  {/* El ícono se centra en el punto de la órbita por su cuenta
                      (posición absoluta propia), en vez de compartir un único
                      `-translate-y-1/2` con la etiqueta -- así su posición en
                      el anillo queda fija sin importar si la etiqueta ocupa
                      una línea ("Turnos") o dos ("Historia clínica"). Antes
                      compartían un mismo bloque flex centrado como un todo, y
                      una etiqueta más alta corría el ícono hacia arriba de su
                      lugar real en el círculo. */}
                  <div className="relative size-0">
                    <span className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-border/60 bg-card text-primary shadow-sm sm:size-12">
                      <item.icon className="size-5" />
                    </span>
                    <span className="absolute top-[calc(50%+28px)] left-1/2 inline-block max-w-[64px] -translate-x-1/2 rounded-lg bg-background/90 px-1.5 py-0.5 text-center text-[10px] leading-tight font-medium text-muted-foreground shadow-sm sm:top-[calc(50%+30px)] sm:max-w-none sm:rounded-full sm:px-2">
                      {item.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
