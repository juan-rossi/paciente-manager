import Image from "next/image";
import { cn } from "@/lib/utils";
import isotipo from "@/assets/logo_isotipo.png";
import logotipo from "@/assets/logo_logotipo.png";

// Isotipo y logotipo oficiales de Semio360 (assets provistos por el usuario,
// no generados) -- casi cuadrado (1246x1262) el isotipo, así que
// `size-*` en el className mantiene la proporción sin distorsión visible.
//
// width/height explícitos: sin ellos next/image toma el tamaño del PNG
// (1246px) y pide variantes de 1920/3840px para un ícono de 32px.
// alt con texto aunque sea decorativo (aria-hidden ya lo oculta del lector
// de pantalla): los auditores SEO cuentan alt="" como imagen sin alt.
export function Semio360Mark({ className }: { className?: string }) {
  return (
    <Image
      src={isotipo}
      width={128}
      height={130}
      alt="Semio360"
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
      width={400}
      height={85}
      alt="Semio360"
      className={cn("h-auto w-auto object-contain", className)}
    />
  );
}
