import { Clock, ShieldX } from "lucide-react";

export type EstadoAvisoModeracion = "pendiente" | "rechazado" | null;

// Lo que devuelven las rutas de /api/perfil tras guardar ("publicado" o `null`
// no necesitan aviso).
export function estadoAviso(estado: string | null | undefined): EstadoAvisoModeracion {
  return estado === "pendiente" || estado === "rechazado" ? estado : null;
}

// Aviso en Configuración cuando la foto o la biografía que cargó el médico
// todavía no se ve en su perfil público (ver `src/lib/moderacion.ts`).
export function AvisoModeracion({ campo, estado }: { campo: "foto" | "biografia"; estado: EstadoAvisoModeracion }) {
  if (!estado) return null;
  const nombre = campo === "foto" ? "tu foto de perfil" : "tu biografía";
  const anterior = campo === "foto" ? "la foto anterior" : "la biografía anterior";

  if (estado === "pendiente") {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
      >
        <Clock className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">Un administrador revisará pronto {nombre}</span>
          <span className="text-xs">
            Mientras tanto, tu perfil público sigue mostrando {anterior}.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive"
    >
      <ShieldX className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">
          {campo === "foto" ? "Tu foto de perfil no fue aprobada" : "Tu biografía no fue aprobada"}
        </span>
        <span className="text-xs">
          No se muestra en tu perfil público. {campo === "foto" ? "Subí otra" : "Modificala"} para que se
          vuelva a revisar.
        </span>
      </div>
    </div>
  );
}
