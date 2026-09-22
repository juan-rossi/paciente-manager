"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CONFIGURACION_TAB_COOKIE, DEFAULT_CONFIGURACION_TAB } from "@/lib/configuracion-tabs";

const CONFIGURACION_PATH = "/configuracion";

// Vive en el layout de (app) (montado en TODAS las pantallas, no solo en
// Configuración) para resetear la cookie de la tab apenas el usuario deja
// Configuración -- así, para cuando vuelva a entrar (sea con un click
// normal, con el botón atrás, o con cualquier navegación prefetcheada por
// Next.js), la cookie ya dice "practica" de antemano. Intentar corregir
// esto recién al LLEGAR a Configuración (en un efecto de ese componente)
// resultó frágil: el Router Cache de Next a veces reutiliza el render
// anterior sin volver a montar nada, así que ese efecto no siempre corre.
// Reseteando acá, en cambio, no importa cómo se sirva la vuelta a
// Configuración -- la cookie ya está en el valor correcto antes de que esa
// navegación siquiera empiece.
export function ConfiguracionTabCookieReset() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== CONFIGURACION_PATH) {
      document.cookie = `${CONFIGURACION_TAB_COOKIE}=${DEFAULT_CONFIGURACION_TAB}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [pathname]);

  return null;
}
