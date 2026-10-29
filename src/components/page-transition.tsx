import { ViewTransition } from "react";

// Transición entre pantallas de la app: el `loading.tsx` de cada sección
// muestra un esqueleto al instante (envuelto en `SkeletonExit`) y, cuando el
// servidor termina, el contenido real entra con un fundido y una subida corta
// (`PageEnter`). Las animaciones están en globals.css (`.skeleton-exit`,
// `.page-enter`).
//
// `default="none"` evita que se animen en otras transiciones (router.refresh,
// cambios de estado dentro de la página): solo animan al aparecer/irse.

export function PageEnter({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" default="none">
      {children}
    </ViewTransition>
  );
}

export function SkeletonExit({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition exit="skeleton-exit" default="none">
      {children}
    </ViewTransition>
  );
}
