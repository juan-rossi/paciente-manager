import type { ReactNode } from "react";
import { Semio360Mark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  title?: string;
};

// Chrome de "ventana de app" reutilizado en todos los mockups del producto
// (Hero, Menos administración, Demo interactiva) para que se sientan parte
// de la misma interfaz real, no capturas sueltas.
export function AppWindow({ children, className, title = "Semio360" }: Props) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_rgba(0,0,0,.04),0_24px_64px_-24px_rgba(79,70,229,.25)]",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#FF5F57]" />
          <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="size-2.5 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex flex-1 items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Semio360Mark className="size-3.5" />
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}
