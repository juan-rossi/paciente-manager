"use client";

import { useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};

// Lee una clave de localStorage sin desalinear el render del servidor con el
// del cliente: en el server (y durante la hidratación) devuelve null, y recién
// después el valor guardado. Storage no disponible (modo privado, etc.) se
// trata como "no hay nada guardado".
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(
    sinSuscripcion,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null
  );
}
