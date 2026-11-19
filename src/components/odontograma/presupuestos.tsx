"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Plus, Printer, ReceiptText, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateInput } from "@/components/patient-form/date-input";
import { formatFechaCorta } from "@/components/patient-form/utils";
import { formatDateParamBA } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { CODIGO_INFO, planDeTratamiento, type Cara, type DatosOdontograma } from "@/lib/odontograma";
import type { PracticaCatalogo } from "@/lib/practica-odontologica";
import {
  MONTO_MAXIMO,
  PRESUPUESTO_ESTADO_LABELS,
  calcularTotal,
  describirUbicacion,
  formatPesos,
  type PresupuestoEstado,
  type PresupuestoValue,
} from "@/lib/presupuesto";
import { PracticaPickerDialog } from "./practica-picker-dialog";

export type PresupuestosProps = {
  patientId: string;
  initialPresupuestos: PresupuestoValue[];
  // practicaId -> arancel particular del médico (Configuración > Aranceles).
  aranceles: Record<string, number>;
  // Estado de la última visita: las prestaciones requeridas son el plan de
  // tratamiento a presupuestar.
  datos: DatosOdontograma | null;
};

// Un ítem mientras se arma el presupuesto: el monto es texto para poder
// dejarlo vacío mientras se escribe.
type ItemBorrador = {
  key: number;
  practicaId: string;
  codigo: string;
  descripcion: string;
  pieza: string | null;
  caras: Cara[];
  monto: string;
};

const CLASE_ESTADO: Record<PresupuestoEstado, string> = {
  PENDIENTE: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  ACEPTADO: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  RECHAZADO: "border-border bg-muted text-muted-foreground",
};

function parseMonto(texto: string): number | null {
  if (!/^\d+$/.test(texto.trim())) return null;
  const n = Number(texto.trim());
  return n <= MONTO_MAXIMO ? n : null;
}

export function Presupuestos({ patientId, initialPresupuestos, aranceles, datos }: PresupuestosProps) {
  const [presupuestos, setPresupuestos] = useState(initialPresupuestos);
  const activos = presupuestos.filter((p) => !p.deletedAt);

  // Plan de tratamiento en texto ("36 Caries (O)"), como ayuda al armarlo.
  const plan = useMemo(
    () =>
      datos
        ? planDeTratamiento(datos).map(
            (i) => `${i.pieza} ${CODIGO_INFO[i.codigo].label}${i.cara ? ` (${i.cara})` : ""}`
          )
        : [],
    [datos]
  );

  // --- Nuevo presupuesto ------------------------------------------------------
  const [abierto, setAbierto] = useState(false);
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [fecha, setFecha] = useState(() => formatDateParamBA(new Date()));
  const [nota, setNota] = useState("");
  const [items, setItems] = useState<ItemBorrador[]>([]);
  const [siguienteKey, setSiguienteKey] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBorrador = calcularTotal(items.map((i) => ({ monto: parseMonto(i.monto) ?? 0 })));

  function abrirNuevo() {
    setFecha(formatDateParamBA(new Date()));
    setNota("");
    setItems([]);
    setError(null);
    setAbierto(true);
  }

  async function agregarItem(practica: PracticaCatalogo, pieza: string | null, caras: Cara[]) {
    const arancel = aranceles[practica.id];
    setItems((prev) => [
      ...prev,
      {
        key: siguienteKey,
        practicaId: practica.id,
        codigo: practica.codigo,
        descripcion: practica.descripcion,
        pieza,
        caras,
        monto: arancel !== undefined ? String(arancel) : "",
      },
    ]);
    setSiguienteKey((k) => k + 1);
    setError(null);
    return null;
  }

  async function guardar() {
    const montos = items.map((i) => parseMonto(i.monto));
    if (items.length === 0) {
      setError("Agregá al menos una práctica.");
      return;
    }
    if (montos.some((m) => m === null)) {
      setError("Completá el monto de todas las prácticas (en pesos, sin centavos).");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/presupuestos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha,
          nota: nota.trim() || null,
          items: items.map((i, idx) => ({
            practicaId: i.practicaId,
            pieza: i.pieza,
            caras: i.caras,
            monto: montos[idx],
          })),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo guardar el presupuesto.");
        return;
      }
      setPresupuestos((prev) => [data.presupuesto as PresupuestoValue, ...prev]);
      setAbierto(false);
    } catch {
      setError("No se pudo guardar el presupuesto.");
    } finally {
      setGuardando(false);
    }
  }

  // --- Estado y borrado --------------------------------------------------------
  const [cambiandoId, setCambiandoId] = useState<string | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [eliminarId, setEliminarId] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);

  async function cambiarEstado(id: string, estado: PresupuestoEstado) {
    setCambiandoId(id);
    setErrorLista(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/presupuestos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!res.ok) {
        setErrorLista("No se pudo actualizar el presupuesto.");
        return;
      }
      setPresupuestos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
    } catch {
      setErrorLista("No se pudo actualizar el presupuesto.");
    } finally {
      setCambiandoId(null);
    }
  }

  async function eliminar() {
    if (!eliminarId) return;
    setEliminando(true);
    setErrorLista(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/presupuestos/${eliminarId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setErrorLista("No se pudo eliminar el presupuesto.");
        return;
      }
      const ahora = new Date().toISOString();
      setPresupuestos((prev) => prev.map((p) => (p.id === eliminarId ? { ...p, deletedAt: ahora } : p)));
      setEliminarId(null);
    } catch {
      setErrorLista("No se pudo eliminar el presupuesto.");
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {activos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay presupuestos.{" "}
          {plan.length > 0
            ? `El plan de tratamiento tiene ${plan.length} prestación${plan.length === 1 ? "" : "es"} requerida${plan.length === 1 ? "" : "s"} para presupuestar.`
            : "Marcá prestaciones requeridas en el odontograma para tener un plan de tratamiento que presupuestar."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {activos.map((p) => (
            <li key={p.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{formatFechaCorta(p.fecha)}</span>
                  <Badge variant="outline" className={CLASE_ESTADO[p.estado]}>
                    {PRESUPUESTO_ESTADO_LABELS[p.estado]}
                  </Badge>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatPesos(calcularTotal(p.items))}
                </span>
              </div>
              <ul className="mt-2 flex flex-col gap-1 text-sm">
                {p.items.map((i) => (
                  <li key={i.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="text-muted-foreground">{describirUbicacion(i)} — </span>
                      <span className="font-mono text-xs">{i.codigo}</span> {i.descripcion}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{formatPesos(i.monto)}</span>
                  </li>
                ))}
              </ul>
              {p.nota && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{p.nota}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/patients/${patientId}/presupuestos/${p.id}/imprimir`} target="_blank" />}
                >
                  <Printer className="size-3.5" />
                  Imprimir
                </Button>
                {p.estado !== "ACEPTADO" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cambiandoId === p.id}
                    onClick={() => cambiarEstado(p.id, "ACEPTADO")}
                  >
                    <Check className="size-3.5" />
                    Aceptado
                  </Button>
                )}
                {p.estado !== "RECHAZADO" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={cambiandoId === p.id}
                    onClick={() => cambiarEstado(p.id, "RECHAZADO")}
                  >
                    <X className="size-3.5" />
                    Rechazado
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-muted-foreground hover:text-destructive"
                  onClick={() => setEliminarId(p.id)}
                  aria-label="Eliminar presupuesto"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {errorLista && <p className="text-sm text-destructive">{errorLista}</p>}

      <div>
        <Button type="button" onClick={abrirNuevo}>
          <Plus className="size-4" />
          Nuevo presupuesto
        </Button>
      </div>

      <Dialog open={abierto} onOpenChange={(o) => !guardando && setAbierto(o)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo presupuesto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {plan.length > 0 && (
              <div className="rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Plan de tratamiento: </span>
                {plan.join(" · ")}
                <p className="mt-1">Al agregar una práctica, las piezas del plan aparecen primero.</p>
              </div>
            )}

            {items.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                Agregá las prácticas del nomenclador a presupuestar.
              </p>
            ) : (
              <ul className="flex max-h-[45dvh] flex-col divide-y overflow-y-auto rounded-lg border">
                {items.map((item) => {
                  const montoInvalido = item.monto !== "" && parseMonto(item.monto) === null;
                  return (
                    <li key={item.key} className="flex items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="truncate">
                          <span className="font-mono text-xs">{item.codigo}</span> {item.descripcion}
                        </p>
                        <p className="text-xs text-muted-foreground">{describirUbicacion(item)}</p>
                      </div>
                      <div className="relative w-32 shrink-0">
                        <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                          $
                        </span>
                        <Input
                          inputMode="numeric"
                          aria-label={`Monto de ${item.descripcion}`}
                          aria-invalid={montoInvalido || undefined}
                          className="pl-6 text-right tabular-nums"
                          placeholder="Monto"
                          value={item.monto}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((i) =>
                                i.key === item.key ? { ...i, monto: e.target.value.replace(/[^\d]/g, "") } : i
                              )
                            )
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Quitar"
                        onClick={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setPickerAbierto(true)}>
                <Plus className="size-4" />
                Agregar práctica
              </Button>
              <p className={cn("text-sm", items.length === 0 && "text-muted-foreground")}>
                Total <span className="ml-1 text-base font-semibold tabular-nums">{formatPesos(totalBorrador)}</span>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="flex flex-col gap-1.5">
                <Label>Fecha</Label>
                <DateInput value={fecha} onChange={setFecha} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Nota (opcional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Ej. forma de pago, cantidad de sesiones, validez"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="button" onClick={guardar} disabled={guardando || items.length === 0}>
              <ReceiptText className="size-4" />
              {guardando ? "Guardando..." : "Guardar presupuesto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PracticaPickerDialog
        open={pickerAbierto}
        onOpenChange={setPickerAbierto}
        subtitulo="Presupuesto"
        datos={datos ?? undefined}
        onAgregar={agregarItem}
      />

      <Dialog open={eliminarId !== null} onOpenChange={(o) => !o && !eliminando && setEliminarId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar presupuesto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deja de verse en la ficha, pero queda registrado en el historial de auditoría.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEliminarId(null)} disabled={eliminando}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={eliminar} disabled={eliminando}>
              {eliminando ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
