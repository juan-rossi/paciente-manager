"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, ReceiptText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SettingsSection } from "@/components/settings-section";
import { cn } from "@/lib/utils";
import { filtrarPracticas, nombreCapitulo, type PracticaCatalogo } from "@/lib/practica-odontologica";
import { MONTO_MAXIMO, formatPesos } from "@/lib/presupuesto";

type Props = {
  practicas: PracticaCatalogo[];
  // practicaId -> monto.
  initialAranceles: Record<string, number>;
};

type EstadoFila = "guardando" | "guardado" | "error";

// Aranceles particulares del odontólogo por práctica del nomenclador. Cada
// monto se guarda al salir del campo; vacío lo borra. Prellenan los
// presupuestos (ver components/odontograma/presupuestos.tsx).
export function ArancelesSettings({ practicas, initialAranceles }: Props) {
  const [guardados, setGuardados] = useState<Record<string, number>>(initialAranceles);
  const [borradores, setBorradores] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(initialAranceles).map(([id, monto]) => [id, String(monto)]))
  );
  const [estados, setEstados] = useState<Record<string, EstadoFila>>({});
  const [query, setQuery] = useState("");
  const [soloCargados, setSoloCargados] = useState(false);

  const cargados = Object.keys(guardados).length;

  const grupos = useMemo(() => {
    const visibles = filtrarPracticas(practicas, query).filter((p) => !soloCargados || p.id in guardados);
    const porCapitulo = new Map<number, PracticaCatalogo[]>();
    for (const p of visibles) {
      const lista = porCapitulo.get(p.capitulo) ?? [];
      lista.push(p);
      porCapitulo.set(p.capitulo, lista);
    }
    return [...porCapitulo.entries()].sort(([a], [b]) => a - b);
  }, [practicas, query, soloCargados, guardados]);

  async function guardar(practicaId: string) {
    const texto = (borradores[practicaId] ?? "").trim();
    const anterior = guardados[practicaId];
    const monto = texto === "" ? null : Number(texto);
    if (monto !== null && (!Number.isInteger(monto) || monto > MONTO_MAXIMO)) {
      setEstados((e) => ({ ...e, [practicaId]: "error" }));
      return;
    }
    if (monto === (anterior ?? null)) return;

    setEstados((e) => ({ ...e, [practicaId]: "guardando" }));
    try {
      const res = await fetch("/api/aranceles-odontologicos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practicaId, monto }),
      });
      if (!res.ok) throw new Error();
      setGuardados((g) => {
        const next = { ...g };
        if (monto === null) delete next[practicaId];
        else next[practicaId] = monto;
        return next;
      });
      setEstados((e) => ({ ...e, [practicaId]: "guardado" }));
    } catch {
      setEstados((e) => ({ ...e, [practicaId]: "error" }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Aranceles particulares"
        icon={ReceiptText}
        description="El monto que cobrás por cada práctica del nomenclador. Se usa para completar los presupuestos (después podés ajustarlo para cada paciente). Se guarda solo al salir del campo; dejalo vacío para borrarlo."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-sm sm:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar por código o nombre"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar práctica"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="solo-cargados" checked={soloCargados} onCheckedChange={setSoloCargados} />
            <Label htmlFor="solo-cargados" className="font-normal">
              Solo con arancel ({cargados})
            </Label>
          </div>
        </div>

        {grupos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {soloCargados && cargados === 0 ? "Todavía no cargaste aranceles." : "Ninguna práctica coincide."}
          </p>
        ) : (
          <div className="flex flex-col gap-5">
            {grupos.map(([capitulo, lista]) => (
              <section key={capitulo} className="flex flex-col gap-1">
                <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {nombreCapitulo(capitulo)}
                </h4>
                <ul className="flex flex-col divide-y rounded-lg border">
                  {lista.map((p) => {
                    const estado = estados[p.id];
                    return (
                      <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                        <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{p.codigo}</span>
                        <span className="min-w-0 flex-1 text-sm">{p.descripcion}</span>
                        <span className="flex w-5 shrink-0 justify-center" aria-live="polite">
                          {estado === "guardando" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                          {estado === "guardado" && (
                            <Check className="size-3.5 text-emerald-600" aria-label="Guardado" />
                          )}
                        </span>
                        <div className="relative w-32 shrink-0">
                          <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            inputMode="numeric"
                            aria-label={`Arancel de ${p.descripcion}`}
                            aria-invalid={estado === "error" || undefined}
                            title={estado === "error" ? "No se pudo guardar" : guardados[p.id] !== undefined ? formatPesos(guardados[p.id]) : undefined}
                            className={cn("pl-6 text-right tabular-nums", estado === "error" && "border-destructive")}
                            value={borradores[p.id] ?? ""}
                            onChange={(e) => {
                              const valor = e.target.value.replace(/[^\d]/g, "");
                              setBorradores((b) => ({ ...b, [p.id]: valor }));
                              setEstados((s) => {
                                const next = { ...s };
                                delete next[p.id];
                                return next;
                              });
                            }}
                            onBlur={() => guardar(p.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
