import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_CLASES, parsearFormato, type NodoFormato } from "@/lib/evolucion-formato";

function pintar(nodos: NodoFormato[]): ReactNode[] {
  return nodos.map((n, k) => {
    if (typeof n === "string") return n;
    if (n.tipo !== "c") {
      const Tag = n.tipo === "b" ? "strong" : "em";
      return <Tag key={k}>{pintar(n.hijos)}</Tag>;
    }
    return (
      <span key={k} className={COLOR_CLASES[n.color]}>
        {pintar(n.hijos)}
      </span>
    );
  });
}

// El texto de una evolución con su formato (ver `evolucion-formato.ts`).
export function TextoConFormato({ texto, className }: { texto: string; className?: string }) {
  return <p className={cn("whitespace-pre-wrap", className)}>{pintar(parsearFormato(texto))}</p>;
}
