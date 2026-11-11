"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// El layout (con el contador de respuestas sin leer del header) no se vuelve
// a renderizar al navegar: la página que marca algo leído lo refresca una vez.
export function RefrescarAlMontar() {
  const router = useRouter();
  useEffect(() => {
    router.refresh();
  }, [router]);
  return null;
}
