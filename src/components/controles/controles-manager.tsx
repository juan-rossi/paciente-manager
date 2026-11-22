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
import { GraficoControl, type CurvaReferencia } from "@/components/controles/grafico-control";
import {
  formatPercentil,
  percentilOms,
  PERCENTILES_REFERENCIA,
  puntajeZOms,
  valorReferencia,
  Z_INVEROSIMIL,
  type IndicadorOms,
} from "@/lib/percentiles-oms";
import {
  CAMPO_CONTROL_INFO,
  CAMPOS_CONTROL,
  compararControles,
  controlFromDb,
  formatCambio,
  formatIndicador,
  formatValor,
  MENSAJE_PRESION_INVERTIDA,
  presionCoherente,
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
import type { Especialidad, GrupoEspecialidad } from "@/lib/especialidad";

type Props = {
  patientId: string;
  grupo: GrupoEspecialidad;
  especialidad?: Especialidad | null;
  initialControles: ControlValue[];
  // Para la columna de contexto de cada control (edad, edad gestacional, IMC).
  fechaNacimiento: string | null;
  fum: string | null;
  estatura: string | null;
  // Pediatría: con el sexo y la fecha de nacimiento se calculan los
  // percentiles de la OMS (0 a 5 años).
  sexo?: string | null;
};

const INDICADORES_OMS: ReadonlySet<string> = new Set<IndicadorOms>(["peso", "talla", "perimetroCefalico"]);

function fechaIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

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
export function ControlesManager({
  patientId,
  grupo,
  especialidad,
  initialControles,
  fechaNacimiento,
  fum,
  estatura,
  sexo,
}: Props) {
  const indicadores = indicadoresPara(grupo, especialidad);

  // Percentil OMS de un indicador en un control (solo pediatría, 0-5 años).
  const conPercentiles = grupo === "PEDIATRICA" && !!fechaNacimiento && (sexo === "MASCULINO" || sexo === "FEMENINO");
  const percentil = (indicador: Indicador, c: ControlValue): string | null => {
    if (!conPercentiles || !INDICADORES_OMS.has(indicador.id)) return null;
    const p = percentilOms(indicador.id as IndicadorOms, sexo, fechaNacimiento, c.fecha, c[indicador.campos[0]]);
    return p == null ? null : formatPercentil(p);
  };

  // Curvas P3, P50 y P97 entre el primer y el último control del indicador.
  const referencias = (indicador: Indicador, controles: ControlValue[]): CurvaReferencia[] => {
    if (!conPercentiles || !INDICADORES_OMS.has(indicador.id) || controles.length < 2) return [];
    const t0 = Date.parse(controles[0].fecha);
    const t1 = Date.parse(controles[controles.length - 1].fecha);
    if (!(t1 > t0)) return [];
    const fechas = Array.from({ length: 25 }, (_, k) => fechaIso(t0 + ((t1 - t0) * k) / 24));
    return PERCENTILES_REFERENCIA.map(({ etiqueta, z }) => ({
      etiqueta,
      puntos: fechas.flatMap((fecha) => {
        const valor = valorReferencia(indicador.id as IndicadorOms, sexo as "MASCULINO" | "FEMENINO", fechaNacimiento!, fecha, z);
        return valor == null ? [] : [{ fecha, valor }];
      }),
    })).filter((c) => c.puntos.length > 1);
  };
  const [controles, setControles] = useState<ControlValue[]>(initialControles);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(formularioVacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Pediatría: valores muy lejos de lo esperado para la edad. El primer
  // "Guardar" los avisa; el segundo ("Guardar igual") guarda.
  const [advertencia, setAdvertencia] = useState<string | null>(null);
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
    setAdvertencia(null);
    setAbierto(true);
  }

  function abrirEdicion(c: ControlValue) {
    setEditando(c.id);
    setForm(formularioDe(c));
    setError(null);
    setAdvertencia(null);
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
    if (!presionCoherente(valores.presionSistolica, valores.presionDiastolica)) {
      setError(MENSAJE_PRESION_INVERTIDA);
      return;
    }
    if (!advertencia && conPercentiles) {
      const raros = indicadores.flatMap((i) => {
        if (!INDICADORES_OMS.has(i.id)) return [];
        const z = puntajeZOms(i.id as IndicadorOms, sexo, fechaNacimiento, form.fecha, valores[i.campos[0]]);
        return z != null && Math.abs(z) > Z_INVEROSIMIL ? [`${i.label} ${formatValor(i.campos[0], valores[i.campos[0]]!)} ${i.unidad}`] : [];
      });
      if (raros.length > 0) {
        setError(null);
        setAdvertencia(
          `${raros.join(", ")}: muy lejos de lo esperado para la edad. ¿Está bien cargado? Si es correcto, guardalo igual.`
        );
        return;
      }
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
      onChange={(e) => {
        setForm((f) => ({ ...f, [c]: e.target.value }));
        // Un valor nuevo se vuelve a revisar antes de guardar.
        setAdvertencia(null);
      }}
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
                  {percentil(indicador, ultimo) && (
                    <span className="rounded bg-muted px-1.5 text-xs font-medium tabular-nums">
                      {percentil(indicador, ultimo)}
                    </span>
                  )}
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
                    referencias={referencias(indicador, conValor)}
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
              que los encabezados van abreviados con la unidad abajo, la nota
              va bajo la fecha y las acciones en un solo menú. Cada columna
              toma el ancho de su contenido (con ancho fijo, en el celular
              "127/81" se salía de su celda y se pisaba con la de al lado); en
              el celular la letra es más chica y el año va con dos dígitos, y
              si igual no entra, la tabla se desplaza de costado dentro de su
              borde en vez de encimar valores. */}
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted/50">
                <tr className="text-[11px] leading-tight text-muted-foreground">
                  <th className="px-2 py-2 text-left font-semibold sm:px-2.5">
                    Fecha
                    {contexto && <span className="block font-normal">· {contexto.titulo}</span>}
                  </th>
                  {indicadores.map((i) => (
                    <th
                      key={i.id}
                      className="px-1 py-2 text-right font-semibold whitespace-nowrap sm:px-1.5"
                      title={i.label}
                    >
                      {i.corto}
                      <span className="block font-normal">{unidadIndicador(i, "corto")}</span>
                    </th>
                  ))}
                  <th className="w-9">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((c) => {
                  const ctx = contexto?.valor(c);
                  return (
                    <tr key={c.id} className="border-t border-border/60 align-top">
                      <td className="px-2 py-2 sm:px-2.5">
                        <span className="whitespace-nowrap tabular-nums">
                          <span className="sm:hidden">{formatFechaCorta(c.fecha).replace(/\/\d{2}(\d{2})$/, "/$1")}</span>
                          <span className="hidden sm:inline">{formatFechaCorta(c.fecha)}</span>
                        </span>
                        {ctx && <span className="block text-xs text-muted-foreground tabular-nums">{ctx}</span>}
                        {c.nota && <span className="block text-xs break-words text-muted-foreground">{c.nota}</span>}
                      </td>
                      {indicadores.map((i) => (
                        <td key={i.id} className="px-1 py-2 text-right whitespace-nowrap tabular-nums sm:px-1.5">
                          {valorIndicador(i, c) ?? <span className="text-muted-foreground">—</span>}
                          {percentil(i, c) && (
                            <span className="block text-xs text-muted-foreground">{percentil(i, c)}</span>
                          )}
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
            {advertencia && <p className="text-sm text-amber-700 dark:text-amber-400">{advertencia}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando..." : advertencia ? "Guardar igual" : editando ? "Guardar" : "Agregar"}
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
