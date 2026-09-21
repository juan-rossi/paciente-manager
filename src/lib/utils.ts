import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Para inputs de teléfono editados a mano -- preserva un único "+" inicial
// (prefijo internacional, ej. "+54...") y descarta cualquier otro
// caracter que no sea dígito.
export function filterTelefono(value: string) {
  return value.replace(/(?!^\+)[^\d]/g, "")
}
