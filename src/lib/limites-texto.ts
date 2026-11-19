// Largos máximos de los textos que se guardan. Sin tope, un solo pedido podía
// guardar varios MB en un campo (inflando la base, las exportaciones y la
// ficha). Son generosos a propósito: nunca deberían cortar un uso real.

// Nombres, domicilio, teléfono, obra social...
export const TEXTO_CORTO = 300;
// Campos del examen físico, antecedentes, motivos.
export const TEXTO_MEDIO = 5_000;
// Evoluciones, dictados, historia vital, diagnóstico, tratamiento. Una sesión
// de psicología de una hora transcripta ronda los 60.000 caracteres.
export const TEXTO_LARGO = 200_000;

// Una fecha "YYYY-MM-DD..." que además sea una fecha real. Sin esto, un texto
// cualquiera terminaba en `new Date("hola")` (Invalid Date) y en un error 500.
export function esFechaValida(valor: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(valor) && !Number.isNaN(new Date(valor).getTime());
}

export const MENSAJE_FECHA_INVALIDA = "La fecha no es válida.";
