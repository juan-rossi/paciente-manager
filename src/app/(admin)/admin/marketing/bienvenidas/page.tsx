import { BienvenidasScreen } from "@/components/admin/bienvenidas-screen";
import { formatFechaCorta } from "@/lib/admin-metrics";
import { contarBienvenidas, getBienvenidas, getExcluidos } from "@/lib/marketing-bienvenidas";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ estado?: string }>;

export default async function AdminBienvenidasPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const estado = sp.estado === "publicadas" ? "publicadas" : "pendientes";

  const [medicos, conteo, excluidos] = await Promise.all([
    getBienvenidas(estado),
    contarBienvenidas(),
    getExcluidos(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <BienvenidasScreen
        estado={estado}
        conteo={conteo}
        medicos={medicos.map((m) => ({
          id: m.id,
          nombreCompleto: m.nombreCompleto,
          especialidad: m.especialidad,
          ciudades: m.ciudades,
          agendaVirtual: m.agendaVirtual,
          url: m.url,
          generoSugerido: m.generoSugerido,
          genero: m.genero,
          altaTexto: formatFechaCorta(m.altaAt),
          publicadaTexto: m.publicadaAt ? formatFechaCorta(m.publicadaAt) : null,
        }))}
      />

      {excluidos.total > 0 && (
        <details className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">
            {excluidos.total} médico{excluidos.total === 1 ? "" : "s"} todavía no cumple
            {excluidos.total === 1 ? "" : "n"} los requisitos
          </summary>
          <ul className="mt-3 flex flex-col gap-2">
            {excluidos.medicos.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{m.nombreCompleto}</span>
                {m.faltantes.map((f) => (
                  <span
                    key={f}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  >
                    {f}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          {excluidos.total > excluidos.medicos.length && (
            <p className="mt-3 text-xs text-muted-foreground">
              Se muestran los {excluidos.medicos.length} más recientes de {excluidos.total}.
            </p>
          )}
        </details>
      )}
    </div>
  );
}
