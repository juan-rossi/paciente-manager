"use client";

import { useEffect } from "react";
import {
  ORIGEN_COOKIE,
  ORIGEN_COOKIE_MAX_AGE_SECONDS,
  origenDeVisita,
  serializarOrigen,
} from "@/lib/origen-registro";

// Guarda de dónde llegó la visita (ver src/lib/origen-registro.ts) para
// adjuntarlo a la cuenta si después se registra. Va en las páginas públicas
// y en /signup -- nunca dentro de la app.
export function CapturaOrigen() {
  useEffect(() => {
    const actual = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${ORIGEN_COOKIE}=`))
      ?.slice(ORIGEN_COOKIE.length + 1);
    const origen = origenDeVisita(new URL(window.location.href), document.referrer, actual);
    if (!origen) return;
    document.cookie = `${ORIGEN_COOKIE}=${serializarOrigen(origen)}; path=/; max-age=${ORIGEN_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }, []);

  return null;
}
