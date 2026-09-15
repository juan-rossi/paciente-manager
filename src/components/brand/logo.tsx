import Image from "next/image";
import { cn } from "@/lib/utils";
import isotipo from "@/assets/logo_isotipo.png";
import logotipo from "@/assets/logo_logotipo.png";

// Isotipo y logotipo oficiales de Semio360 (assets provistos por el usuario,
// no generados) -- casi cuadrado (1246x1262) el isotipo, así que
// `size-*` en el className mantiene la proporción sin distorsión visible.
export function Semio360Mark({ className }: { className?: string }) {
  return (
    <Image
      src={isotipo}
      alt=""
      aria-hidden="true"
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}

// El logotipo es un lockup horizontal ancho (1332x283) -- usar clases de
// altura (`h-*`) en el className, nunca `size-*`/`w-*`, para no deformarlo.
export function Semio360Wordmark({ className }: { className?: string }) {
  return (
    <Image
      src={logotipo}
      alt="Semio360"
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
