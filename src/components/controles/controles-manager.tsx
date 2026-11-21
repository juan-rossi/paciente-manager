"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateInput } from "@/components/patient-form/date-input";
import { edadLegible, formatFechaCorta } from "@/components/patient-form/utils";
import { GraficoControl } from "@/components/controles/grafico-control";
import {
  CAMPO_CONTROL_INFO,
  CAMPOS_CONTROL,
  compararControles,
  controlFromDb,
  formatCambio,
  formatIndicador,
  formatValor,
  unidadIndicador,
  indicadoresPara,
  parseValor,
  type CampoControl,
  type ControlValue,
  type Indicador,
} from "@/lib/controles";
import { edadGestacional } from "@/lib/obstetricia";
import { calcularImc } from "@/lib/nutricion";
import { formatDateParamBA } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import type { GrupoEspecialidad } from "@/lib/especialidad";

type Props = {
  patientId: string;
  grupo: GrupoEspecialidad;
  initialControles: ControlValue[];
  // Para la columna de contexto de cada control (edad, edad gestacional, IMC).
  fechaNacimiento: string | null;
  fum: string | null;
  estatura: string | null;
};

const FILAS_VISIBLES = 5;

function partesDe(fecha: string) {
  const [year, month, day] = fecha.split("-").map(Number);
  return { year, month, day };
}

// Dato derivado que acompaña a cada control según el grupo: la edad en
// pediatría, la edad gestacional en obstetricia (con la FUM cargada) y el IMC
// en nutrición (con la estatura cargada).
function columnaContexto(
  grupo: GrupoEspecialidad,
  ctx: Pick<Props, "fechaNacimiento" | "fum" | "estatura">
): { titulo: string; valor: (c: ControlValue) => string } | null {
  if (grupo === "PEDIATRICA" && ctx.fechaNacimiento) {
    const nacimiento = ctx.fechaNacimiento;
    return { titulo: "Edad", valor: (c) => edadLegible(nacimiento, partesDe(c.fecha)) };
  }
  if (grupo === "GINECOLOGICA" && ctx.fum) {
    const fum = ctx.fum;
    return {
      titulo: "EG",
      valor: (c) => {
        const eg = edadGestacional(fum, partesDe(c.fecha));
        return eg ? `${eg.semanas}s ${eg.dias}d` : "";
      },
    };
  }
  if (grupo === "NUTRICION" && ctx.estatura) {
    const estatura = ctx.estatura;
    return {
      titulo: "IMC",
      valor: (c) => {
        const imc = c.peso != null ? calcularImc(String(c.peso), estatura) : null;
        return imc == null ? "" : imc.toLocaleString("es-AR", { maximumFractionDigits: 1 });
      },
    };
  }
  return null;
}

function valorIndicador(indicador: Indicador, c: ControlValue): string | null {
  return formatIndicador(indicador, c);
}

type Formulario = { fecha: string; nota: string } & Record<CampoControl, string>;

function formularioVacio(): Formulario {
  return {
    fecha: formatDateParamBA(new Date()),
    nota: "",
    ...(Object.fromEntries(CAMPOS_CONTROL.map((c) => [c, ""])) as Record<CampoControl, string>),
  };
}

function formularioDe(c: ControlValue): Formulario {
  return {
    fecha: c.fecha,
    nota: c.nota ?? "",
    ...(Object.fromEntries(
      CAMPOS_CONTROL.map((campo) => [campo, c[campo] == null ? "" : String(c[campo]).replace(".", ",")])
    ) as Record<CampoControl, string>),
  };
}

// Controles con fecha de la ficha (ver src/lib/controles.ts): una tarjeta por
// indicador con el último valor, el cambio desde el control anterior y la
// línea en el tiempo; debajo, la tabla de todos los controles.
export function ControlesManager({ patientId, grupo, initialControles, fechaNacimiento, fum, estatura }: Props) {
  const indicadores = indicadoresPara(grupo);
  const [controles, setControles] = useState<ControlValue[]>(initialControles);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(formularioVacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eliminarId, setEliminarId] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [verTodos, setVerTodos] = useState(false);
  // Control con el menú de acciones (⋯) abierto.
  const [menuId, setMenuId] = useState<string | null>(null);

  const cronologicos = useMemo(
    () => [...controles].sort(compararControles),
    [controles]
  );
  const recientes = [...cronologicos].reverse();
  const contexto = columnaContexto(grupo, { fechaNacimiento, fum, estatura });
  // Indicadores con al menos un valor cargado: los que llevan tarjeta.
  const conDatos = indicadores.filter((i) => cronologicos.some((c) => valorIndicador(i, c) != null));

  function abrirNuevo() {
    setEditando(null);
    setForm(formularioVacio());
    setError(null);
    setAbierto(true);
  }

  function abrirEdicion(c: ControlValue) {
    setEditando(c.id);
    setForm(formularioDe(c));
    setError(null);
    setAbierto(true);
  }

  async function guardar() {
    const valores: Partial<Record<CampoControl, number | null>> = {};
    for (const campo of CAMPOS_CONTROL) {
      const v = parseValor(form[campo], campo);
      if (Number.isNaN(v)) {
        setError(`${CAMPO_CONTROL_INFO[campo].label}: escribí solo el número (ej. 72,5).`);
        return;
      }
      valores[campo] = v;
    }
    if (CAMPOS_CONTROL.every((c) => valores[c] == null)) {
      setError("Cargá al menos un valor.");
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      const url = editando
        ? `/api/patients/${patientId}/controles/${editando}`
        : `/api/patients/${patientId}/controles`;
      const res = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: form.fecha, nota: form.nota, ...valores }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo guardar el control.");
        return;
      }
      const guardado = controlFromDb(data.control);
      setControles((prev) => (editando ? prev.map((c) => (c.id === editando ? guardado : c)) : [...prev, guardado]));
      setAbierto(false);
    } catch {
      setError("No se pudo guardar el control. Revisá la conexión.");
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!eliminarId) return;
    setEliminando(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/controles/${eliminarId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "No se pudo eliminar el control.");
        return;
      }
      setControles((prev) => prev.filter((c) => c.id !== eliminarId));
      setEliminarId(null);
    } catch {
      setError("No se pudo eliminar el control. Revisá la conexión.");
    } finally {
      setEliminando(false);
    }
  }

  const campo = (c: CampoControl, placeholder?: string) => (
    <Input
      inputMode="decimal"
      placeholder={placeholder ?? CAMPO_CONTROL_INFO[c].ejemplo}
      aria-label={CAMPO_CONTROL_INFO[c].label}
      value={form[c]}
      onChange={(e) => setForm((f) => ({ ...f, [c]: e.target.value }))}
    />
  );

  const filas = verTodos ? recientes : recientes.slice(0, FILAS_VISIBLES);

  return (
    <div className="flex flex-col gap-5">
      {controles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay controles. Cargá {indicadores.map((i) => i.label.toLowerCase()).join(", ")} en cada
          consulta para ver cómo evolucionan.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {conDatos.map((indicador, idx) => {
            const conValor = cronologicos.filter((c) => valorIndicador(indicador, c) != null);
            // Con una cantidad impar de tarjetas, la última ocupa todo el
            // ancho en vez de quedar sola con un hueco al lado.
            const ancha = conDatos.length % 2 === 1 && idx === conDatos.length - 1;
            const ultimo = conValor[conValor.length - 1];
            const anterior = conValor.length > 1 ? conValor[conValor.length - 2] : null;
            const principal = indicador.campos[0];
            const cambio = anterior ? formatCambio(indicador, ultimo, anterior) : null;
            return (
              <div
                key={indicador.id}
                className={cn("flex flex-col gap-2 rounded-lg border border-border/60 p-3", ancha && "sm:col-span-2")}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{indicador.label}</span>
                  {indicador.campos.length > 1 && (
                    <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <svg width="14" height="4" aria-hidden>
                          <line x1="0" x2="14" y1="2" y2="2" stroke="var(--primary)" strokeWidth="2" />
                        </svg>
                        {CAMPO_CONTROL_INFO[indicador.campos[0]].corto}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg width="14" height="4" aria-hidden>
                          <line x1="0" x2="14" y1="2" y2="2" stroke="var(--primary)" strokeWidth="2" strokeDasharray="4 3" />
                        </svg>
                        {CAMPO_CONTROL_INFO[indicador.campos[1]].corto}
                      </span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-xl font-semibold tabular-nums">{valorIndicador(indicador, ultimo)}</span>
                  <span className="text-sm text-muted-foreground">{unidadIndicador(indicador, "valor")}</span>
                  {cambio && (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {cambio}{" "}
                      {anterior!.fecha === ultimo.fecha
                        ? "respecto del control anterior"
                        : `desde el ${formatFechaCorta(anterior!.fecha)}`}
                    </span>
                  )}
                </div>
                {conValor.length > 1 ? (
                  <GraficoControl
                    titulo={indicador.label}
                    unidad={unidadIndicador(indicador, "valor")}
                    dominio={indicador.escala}
                    series={indicador.campos.map((c) => CAMPO_CONTROL_INFO[c].corto)}
                    formatear={(s, v) => formatValor(indicador.campos[s] ?? principal, v)}
                    puntos={conValor.map((c) => ({ fecha: c.fecha, valores: indicador.campos.map((f) => c[f]) }))}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {formatFechaCorta(ultimo.fecha)} · Con otro control se ve la evolución.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {controles.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* Tabla compacta: la ficha la muestra en una columna angosta, así
              que las columnas son de ancho fijo (nada empuja de costado), los
              encabezados van abreviados con la unidad abajo, la nota va bajo
              la fecha y las acciones en un solo menú. */}
          <div className="rounded-md border border-border">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className={indicadores.length > 4 ? "w-[30%]" : "w-[34%]"} />
                {indicadores.map((i) => (
                  <col key={i.id} />
                ))}
                <col className="w-9" />
              </colgroup>
              <thead className="bg-muted/50">
                <tr className="text-[11px] leading-tight text-muted-foreground">
                  <th className="px-2.5 py-2 text-left font-semibold">
                    Fecha
                    {contexto && <span className="block font-normal">· {contexto.titulo}</span>}
                  </th>
                  {indicadores.map((i) => (
                    <th key={i.id} className="px-1.5 py-2 text-right font-semibold" title={i.label}>
                      {i.corto}
                      <span className="block font-normal">{unidadIndicador(i, "corto")}</span>
                    </th>
                  ))}
                  <th>
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => {
                  const ctx = contexto?.valor(c);
                  return (
                    <tr key={c.id} className="border-t border-border/60 align-top">
                      <td className="px-2.5 py-2">
                        <span className="tabular-nums">{formatFechaCorta(c.fecha)}</span>
                        {ctx && <span className="block text-xs text-muted-foreground tabular-nums">{ctx}</span>}
                        {c.nota && <span className="block text-xs break-words text-muted-foreground">{c.nota}</span>}
                      </td>
                      {indicadores.map((i) => (
                        <td key={i.id} className="px-1.5 py-2 text-right tabular-nums">
                          {valorIndicador(i, c) ?? <span className="text-muted-foreground">—</span>}
                        </td>
                      ))}
                      <td className="py-1 pr-1 text-right">
                        <Popover open={menuId === c.id} onOpenChange={(open) => setMenuId(open ? c.id : null)}>
                          <PopoverTrigger
                            aria-label={`Acciones del control del ${formatFechaCorta(c.fecha)}`}
                            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          >
                            <MoreHorizontal className="size-4" />
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-40 gap-0.5 p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              className="justify-start"
                              onClick={() => {
                                setMenuId(null);
                                abrirEdicion(c);
                              }}
                            >
                              <Pencil className="size-4" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="justify-start text-destructive hover:text-destructive"
                              onClick={() => {
                                setMenuId(null);
                                setError(null);
                                setEliminarId(c.id);
                              }}
                            >
                              <Trash2 className="size-4" />
                              Eliminar
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {recientes.length > FILAS_VISIBLES && (
            <Button type="button" variant="link" className="self-start px-0" onClick={() => setVerTodos((v) => !v)}>
              {verTodos ? "Ver menos" : `Ver los ${recientes.length} controles`}
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={abrirNuevo}>
          <Plus className="size-4" />
          Nuevo control
        </Button>
      </div>

      <Dialog open={abierto} onOpenChange={(next) => !guardando && setAbierto(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar control" : "Nuevo control"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Completá solo lo que mediste en esta consulta.</p>
            <div className="flex flex-col gap-1.5">
              <Label>Fecha</Label>
              <div className="sm:max-w-48">
                <DateInput value={form.fecha} onChange={(fecha) => setForm((f) => ({ ...f, fecha }))} />
              </div>
              {controles.some((c) => c.fecha === form.fecha && c.id !== editando) && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Ya hay un control el {formatFechaCorta(form.fecha)}. Si es la misma consulta, conviene editar
                  ese en lugar de cargar otro.
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {indicadores.map((i) => (
                <div key={i.id} className="flex flex-col gap-1.5">
                  <Label>
                    {i.label}{" "}
                    <span className="font-normal text-muted-foreground">({unidadIndicador(i, "rango")})</span>
                  </Label>
                  {i.campos.length > 1 ? (
                    <div className="flex items-center gap-2">
                      {campo(i.campos[0], CAMPO_CONTROL_INFO[i.campos[0]].corto)}
                      <span className="text-muted-foreground">/</span>
                      {campo(i.campos[1], CAMPO_CONTROL_INFO[i.campos[1]].corto)}
                    </div>
                  ) : (
                    campo(i.campos[0])
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Nota <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                rows={2}
                value={form.nota}
                onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando..." : editando ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eliminarId !== null} onOpenChange={(next) => !next && setEliminarId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar control</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Este control dejará de aparecer en la historia clínica. Por la Ley 26.529, el registro no se destruye:
            se conserva de forma segura.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEliminarId(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={confirmarEliminar} disabled={eliminando}>
              {eliminando ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
