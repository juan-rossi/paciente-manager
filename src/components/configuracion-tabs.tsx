"use client";

import { useState, type ReactNode } from "react";
import { Tabs } from "@/components/ui/tabs";
import { CONFIGURACION_TAB_COOKIE, type ConfiguracionTab } from "@/lib/configuracion-tabs";

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

  function handleChange(value: string) {
    setTab(value);
    document.cookie = `${CONFIGURACION_TAB_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <Tabs value={tab} onValueChange={(value) => handleChange(value as string)} {...props}>
      {children}
    </Tabs>
  );
}
