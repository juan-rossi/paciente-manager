// Curvas compartidas del home público, para que todas las secciones se
// muevan con el mismo "carácter" en vez de mezclar easeOut genéricos.

// Salida rápida y frenado largo: entradas de texto y bloques.
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// Resorte suave (casi sin rebote) para lo que cae o se apoya en su lugar.
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 } as const;

// Margen de viewport común para los `whileInView` de las secciones.
export const IN_VIEW = { once: true, margin: "-10%" } as const;
