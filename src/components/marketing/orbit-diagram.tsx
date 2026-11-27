"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

// Cada módulo arranca como un "archivo suelto" (`loose`), desplazado hacia el
// centro y torcido (`ox`/`oy` en unidades de radio, `rot` en grados), y al
// entrar la sección en pantalla se acomoda en su lugar del anillo. Es la
// misma idea que el subtítulo: de planillas, apps y papeles sueltos a una
// sola plataforma. Las 6 funcionalidades existen en el producto.
type OrbitItem = {
  icon: LucideIcon;
  label: string;
  loose: string;
  ox: number;
  oy: number;
  rot: number;
};

const ITEMS: OrbitItem[] = [
  { icon: CalendarDays, label: "Turnos", loose: "turnos.xlsx", ox: -0.26, oy: -0.14, rot: -14 },
  { icon: Users, label: "Pacientes", loose: "Contactos", ox: 0.29, oy: -0.31, rot: 11 },
  { icon: NotebookPen, label: "Historia clínica", loose: "Carpeta", ox: 0.51, oy: 0.06, rot: -8 },
  { icon: FileText, label: "Evoluciones", loose: "notas.doc", ox: 0.2, oy: 0.43, rot: 16 },
  { icon: ClipboardSignature, label: "Consentimientos", loose: "firma.pdf", ox: -0.37, oy: 0.29, rot: -18 },
  { icon: MessageCircle, label: "Recordatorios", loose: "WhatsApp", ox: -0.57, oy: -0.37, rot: 9 },
];

const N = ITEMS.length;
// Radio del anillo como fracción del lado del contenedor (128/320 y 168/420).
const RING = 0.4;
// En el estado suelto los módulos quedan a este porcentaje de su distancia
// final al centro (amontonados como una pila de papeles).
const LOOSE_PULL = 0.35;

function angleOf(i: number) {
  return ((-90 + (360 / N) * i) * Math.PI) / 180;
}

// Punto del módulo i en el viewBox 0..100 del SVG de las líneas.
function svgPoint(i: number) {
  const a = angleOf(i);
  return { x: 50 + RING * 100 * Math.cos(a), y: 50 + RING * 100 * Math.sin(a) };
}

const ASSEMBLE_MS = 1600; // lo que tarda en terminar de armarse (última línea)
const TRAVEL_MS = 800; // un tramo del pulso (módulo -> centro o centro -> módulo)
const PULSE_GAP_MS = 2800; // pausa entre pulsos, para que no distraiga

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function OrbitDiagram() {
  const rootRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRef = useRef<SVGCircleElement>(null);
  const pingRef = useRef<HTMLSpanElement>(null);
  const [assembled, setAssembled] = useState(false);

  // Se arma una sola vez, cuando la mitad del diagrama entra en pantalla.
  useEffect(() => {
    const root = rootRef.current;
    // Con reduced-motion el CSS ya muestra el estado final sin esperar esto.
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setAssembled(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  // Ya armado, cada tanto un dato viaja de un módulo al centro y del centro a
  // otro módulo. Se manipula el DOM directo (refs) para no re-renderizar en
  // cada frame; se pausa cuando el diagrama no está a la vista o la pestaña
  // está oculta.
  useEffect(() => {
    if (!assembled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = rootRef.current;
    const dot = dotRef.current;
    const ping = pingRef.current;
    const nodes = nodeRefs.current;
    if (!root || !dot || !ping) return;

    let visible = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;
    let from = 0;

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
    });
    io.observe(root);

    const setOn = (i: number, on: boolean) => nodes[i]?.classList.toggle("orbit-on", on);

    const travel = (a: { x: number; y: number }, b: { x: number; y: number }, done: () => void) => {
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / TRAVEL_MS);
        const e = easeInOut(t);
        dot.setAttribute("cx", String(a.x + (b.x - a.x) * e));
        dot.setAttribute("cy", String(a.y + (b.y - a.y) * e));
        dot.style.opacity = String(t < 0.1 ? t * 10 : t > 0.9 ? (1 - t) * 10 : 1);
        if (t < 1) raf = requestAnimationFrame(step);
        else done();
      };
      raf = requestAnimationFrame(step);
    };

    const center = { x: 50, y: 50 };
    const cycle = () => {
      if (!visible || document.hidden) {
        timer = setTimeout(cycle, 1000);
        return;
      }
      const a = from;
      const b = (a + 1 + Math.floor(Math.random() * 2)) % N;
      setOn(a, true);
      travel(svgPoint(a), center, () => {
        setOn(a, false);
        ping.classList.remove("orbit-pinging");
        void ping.offsetWidth; // reinicia la animación del latido
        ping.classList.add("orbit-pinging");
        travel(center, svgPoint(b), () => {
          dot.style.opacity = "0";
          setOn(b, true);
          timer = setTimeout(() => {
            setOn(b, false);
            from = b;
            timer = setTimeout(cycle, PULSE_GAP_MS);
          }, 600);
        });
      });
    };
    timer = setTimeout(cycle, ASSEMBLE_MS + 600);

    return () => {
      io.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      nodes.forEach((n) => n?.classList.remove("orbit-on"));
    };
  }, [assembled]);

  return (
    <div
      ref={rootRef}
      data-assembled={assembled ? "" : undefined}
      className="orbit-root relative mx-auto size-[320px] [--orbit-radius:128px] sm:size-[420px] sm:[--orbit-radius:168px]"
    >
      <div className="orbit-ring absolute inset-[10%] rounded-full border border-dashed border-border/70" />

      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        {ITEMS.map((item, i) => {
          const p = svgPoint(i);
          return (
            <line
              key={item.label}
              x1={50}
              y1={50}
              x2={p.x}
              y2={p.y}
              pathLength={1}
              className="orbit-spoke stroke-primary/25"
              strokeWidth={0.3}
              style={{ "--i": i } as CSSProperties}
            />
          );
        })}
        <circle ref={dotRef} r={0.9} cx={50} cy={50} className="fill-primary" style={{ opacity: 0 }} />
      </svg>

      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="orbit-hub relative flex flex-col items-center gap-1.5 rounded-2xl border border-border/60 bg-card px-3.5 py-3 shadow-lg sm:px-5 sm:py-4">
          <span
            ref={pingRef}
            className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-primary/40 opacity-0"
          />
          <Semio360Mark className="size-6 sm:size-8" />
          <span className="font-heading text-xs font-extrabold sm:text-sm">
            Semio<span className="text-primary">360</span>
          </span>
        </div>
      </div>

      {ITEMS.map((item, i) => {
        const a = angleOf(i);
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        // Desplazamiento del estado suelto respecto del lugar final, en
        // múltiplos del radio (así escala igual en mobile y desktop).
        const kx = -(1 - LOOSE_PULL) * cos + item.ox;
        const ky = -(1 - LOOSE_PULL) * sin + item.oy;
        return (
          <div
            key={item.label}
            ref={(el) => {
              nodeRefs.current[i] = el;
            }}
            className="orbit-node absolute size-0"
            style={
              {
                left: `${50 + RING * 100 * cos}%`,
                top: `${50 + RING * 100 * sin}%`,
                "--i": i,
                "--dx": `calc(var(--orbit-radius) * ${kx.toFixed(3)})`,
                "--dy": `calc(var(--orbit-radius) * ${ky.toFixed(3)})`,
                "--r": `${item.rot}deg`,
              } as CSSProperties
            }
          >
            {/* El ícono se centra en el punto del anillo por su cuenta y la
                etiqueta cuelga debajo, así una etiqueta de dos líneas
                ("Historia clínica") no corre el ícono de su lugar. */}
            <span className="orbit-tile absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border bg-card shadow-sm sm:size-12">
              <item.icon className="size-5" />
            </span>
            <span className="absolute top-[calc(50%+28px)] left-1/2 inline-block max-w-[72px] -translate-x-1/2 rounded-lg bg-background/90 px-1.5 py-0.5 text-center text-[10px] leading-tight font-medium text-muted-foreground shadow-sm sm:top-[calc(50%+30px)] sm:max-w-none sm:rounded-full sm:px-2 sm:whitespace-nowrap">
              <span className="orbit-label-loose font-mono whitespace-nowrap">{item.loose}</span>
              <span className="orbit-label-final">{item.label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
