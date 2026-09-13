import { cn } from "@/lib/utils";

// Isotipo de Semio360: un anillo (360°) con tres nodos orbitando -- cada uno
// representa una "señal" del paciente (turno, ficha, evolución). El anillo y
// el nodo superior heredan `currentColor` (así funcionan sobre cualquier
// fondo, incluida la versión reversada en blanco); los dos nodos inferiores
// usan los colores fijos de marca (sky/emerald) tal como en el brand book
// (https://claude.ai/code/artifact/1d47d2a1-3e85-469d-b75b-327e5c2b94d1).
export function Semio360Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="3" opacity="0.35" />
      <circle cx="50" cy="20" r="7" fill="currentColor" />
      <circle cx="24" cy="65" r="5" fill="#0EA5E9" />
      <circle cx="76" cy="65" r="5" fill="#10B981" />
    </svg>
  );
}

export function Semio360Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading font-extrabold", className)}>
      <span>Semio</span>
      <span className="text-primary">360</span>
    </span>
  );
}
