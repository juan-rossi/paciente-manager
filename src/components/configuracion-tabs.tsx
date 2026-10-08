"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Database,
  Eye,
  Lock,
  MessageSquare,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import {
  CONFIGURACION_TAB_COOKIE,
  CONFIGURACION_TAB_EVENT,
  esConfiguracionTab,
  type ConfiguracionTab,
} from "@/lib/configuracion-tabs";
import { cn } from "@/lib/utils";

export const CONFIGURACION_SECTIONS = [
  {
    group: "Consultorio",
    items: [
      { value: "practica" as const, label: "Mi práctica", icon: Building2 },
      { value: "usuarios" as const, label: "Usuarios", icon: Users },
      { value: "mensajeria" as const, label: "Mensajería", icon: MessageSquare },
    ],
  },
  {
    group: "Cuenta",
    items: [
      { value: "perfil" as const, label: "Mi perfil", icon: User },
      { value: "visibilidad" as const, label: "Visibilidad", icon: Eye },
      { value: "seguridad" as const, label: "Seguridad", icon: Lock },
      { value: "plan" as const, label: "Mi plan", icon: Sparkles },
      { value: "datos" as const, label: "Mis datos", icon: Database },
    ],
  },
] as const;

type Props = {
  className?: string;
  orientation?: "horizontal" | "vertical";
  initialTab: ConfiguracionTab;
  children: ReactNode;
};

// La tab activa se guarda en una cookie (no en sessionStorage) para que el
// server component de la página pueda leerla y mandar el HTML inicial ya
// con la tab correcta -- así se evita el parpadeo de arrancar siempre en
// "practica" para recién después saltar a la guardada. El reset a
// "practica" al entrar desde otra pantalla NO se maneja acá -- ver
// `ConfiguracionTabCookieReset`, montado en el layout de (app), que resetea
// la cookie apenas se sale de Configuración (más robusto que corregir al
// llegar, que depende de que este componente se remonte).
export function ConfiguracionTabs({ children, initialTab, ...props }: Props) {
  const [tab, setTab] = useState<string>(initialTab);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function handleChange(value: string) {
    setTab(value);
    document.cookie = `${CONFIGURACION_TAB_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  }

  useEffect(() => {
    function handleIrATab(e: Event) {
      const destino = (e as CustomEvent<string>).detail;
      if (esConfiguracionTab(destino)) {
        setTab(destino);
        document.cookie = `${CONFIGURACION_TAB_COOKIE}=${destino}; path=/; max-age=31536000; samesite=lax`;
      }
    }
    window.addEventListener(CONFIGURACION_TAB_EVENT, handleIrATab);
    return () => window.removeEventListener(CONFIGURACION_TAB_EVENT, handleIrATab);
  }, []);

  // Cerrar al clickear afuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const allItems = CONFIGURACION_SECTIONS.flatMap((s) =>
    s.items.map((item) => ({ ...item, group: s.group }))
  );
  const activeItem = allItems.find((i) => i.value === tab) ?? allItems[0];
  const ActiveIcon = activeItem.icon;

  return (
    <Tabs value={tab} onValueChange={(value) => handleChange(value as string)} {...props}>
      {/* Selector Mobile Desplegable (< md) */}
      <div ref={dropdownRef} className="relative w-full md:hidden">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-xs transition-colors hover:border-primary/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ActiveIcon className="size-4" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                {activeItem.group}
              </span>
              <span className="truncate text-sm font-semibold text-foreground">
                {activeItem.label}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span>Cambiar</span>
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </div>
        </button>

        {/* Menú desplegable */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border border-border/80 bg-card p-1.5 shadow-xl animate-in fade-in-50 zoom-in-95 duration-150">
            {CONFIGURACION_SECTIONS.map((section, idx) => (
              <div key={section.group} className={idx > 0 ? "mt-2 border-t border-border/40 pt-1.5" : ""}>
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                  {section.group}
                </div>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.value === tab;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          handleChange(item.value);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors text-left",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={cn(
                              "size-4 shrink-0",
                              isActive ? "text-primary" : "text-muted-foreground"
                            )}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {children}
    </Tabs>
  );
}
