"use client";

import { useEffect } from "react";

// `ScrollStory` monta su ScrollTrigger de GSAP async (import dinámico) y
// recién ahí reserva el scroll extra del pin (`end: "+=200%"`, ver
// scroll-story.tsx) -- si el navegador scrollea a un hash como "#planes"
// ANTES de que eso termine, la altura de la página todavía no incluye ese
// espacio reservado y el scroll aterriza mucho más arriba de lo que
// corresponde (ej. clickear "Planes" desde /directorio aterrizaba en
// "Confianza y compliance", varias secciones antes).
//
// No alcanza con esperar a que `document.body.scrollHeight` dtege de
// crecer: la primera medición cae ANTES de que el import dinámico de GSAP
// siquiera arranque, así que el layout "ya parece estable" (todavía no
// cambió nada) y se scrollea de una, mal. En cambio se reintenta el scroll
// varias veces con delays crecientes -- el último reintento cae bien
// después de que GSAP terminó de montar el pin (haya tardado lo que haya
// tardado), y los intentos previos de más no hacen daño (como mucho
// corrigen la posición un par de veces mientras carga).
const REINTENTOS_MS = [0, 50, 150, 300, 600, 1000, 1500];

export function ScrollToHash() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = hash.slice(1);

    const timeouts = REINTENTOS_MS.map((ms) =>
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      }, ms)
    );

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return null;
}
