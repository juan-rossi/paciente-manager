"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Pencil,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatPesos,
  labelMes,
  labelMesCorto,
  nombreCobertura,
  sumarMeses,
  type ResumenIngresos,
  type TurnoAsistencia,
} from "@/lib/ingresos";
import { formatDateParamBA, formatHoraBA } from "@/lib/timezone";
import { cn } from "@/lib/utils";

type TurnoFila = {
  id: string;
  inicio: string;
  nombreYApellido: string;
  obraSocial: string | null;
  asistencia: TurnoAsistencia | null;
  montoCobertura: number | null;
  montoPlus: number | null;
  lugarId: string;
};

type Props = {
  mes: string;
  mesActual: string;
  mesMaximo: string;
  lugares: { id: string; nombre: string }[];
  lugarId: string | null;
  resumen: ResumenIngresos;
  proyectado: number;
  evolucion: { mes: string; particular: number; coberturas: number; plus: number; total: number }[];
  sinAranceles: boolean;
  hoy: string;
  turnos: TurnoFila[];
};

type Filtro = "todos" | "sinMarcar" | "atendidos" | "ausentes";

const TODOS_LOS_LUGARES = "__todos__";

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function hrefMes(mes: string, lugarId: string | null) {
  const params = new URLSearchParams({ mes });
  if (lugarId) params.set("lugar", lugarId);
  return `/ingresos?${params.toString()}`;
}

function formatFechaCorta(iso: string) {
  const [, m, d] = formatDateParamBA(new Date(iso)).split("-");
  return `${d}/${m}`;
}

export function IngresosReporte({
  mes,
  mesActual,
  mesMaximo,
  lugares,
  lugarId,
  resumen,
  proyectado,
  evolucion,
  sinAranceles,
  hoy,
  turnos,
}: Props) {
  const router = useRouter();
  const [navegando, startTransition] = useTransition();
  const [filtro, setFiltro] = useState<Filtro>(resumen.sinMarcar > 0 ? "sinMarcar" : "todos");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; cobertura: string; plus: string } | null>(null);

  const hoyParam = formatDateParamBA(new Date(hoy));
  const esMarcable = (t: TurnoFila) => formatDateParamBA(new Date(t.inicio)) <= hoyParam;
  const sinMarcarIds = turnos.filter((t) => t.asistencia === null && new Date(t.inicio) <= new Date(hoy)).map((t) => t.id);
  const nombreLugar = (id: string) => lugares.find((l) => l.id === id)?.nombre ?? "";

  const turnosFiltrados = useMemo(() => {
    const ahora = new Date(hoy);
    switch (filtro) {
      case "sinMarcar":
        return turnos.filter((t) => t.asistencia === null && new Date(t.inicio) <= ahora);
      case "atendidos":
        return turnos.filter((t) => t.asistencia === "ASISTIO");
      case "ausentes":
        return turnos.filter((t) => t.asistencia === "AUSENTE");
      default:
        return turnos;
    }
  }, [filtro, turnos, hoy]);

  const tasaAusentismo =
    resumen.atendidos + resumen.ausentes > 0
      ? Math.round((resumen.ausentes / (resumen.atendidos + resumen.ausentes)) * 100)
      : null;

  function refrescar() {
    startTransition(() => router.refresh());
  }

  async function marcar(turno: TurnoFila, valor: TurnoAsistencia) {
    setError(null);
    setGuardando(turno.id);
    try {
      const response = await fetch(`/api/turnos/${turno.id}/asistencia`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asistencia: turno.asistencia === valor ? null : valor }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudo actualizar el turno.");
        return;
      }
      refrescar();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(null);
    }
  }

  async function marcarTodos(valor: TurnoAsistencia) {
    if (sinMarcarIds.length === 0) return;
    setError(null);
    setGuardando("todos");
    try {
      const response = await fetch("/api/ingresos/asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: sinMarcarIds, asistencia: valor }),
      });
      if (!response.ok) {
        setError("No se pudieron marcar los turnos.");
        return;
      }
      refrescar();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(null);
    }
  }

  async function guardarMontos() {
    if (!editando) return;
    setError(null);
    setGuardando(editando.id);
    try {
      const response = await fetch(`/api/turnos/${editando.id}/asistencia`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asistencia: "ASISTIO",
          montoCobertura: editando.cobertura ? Number(editando.cobertura) : null,
          montoPlus: editando.plus ? Number(editando.plus) : null,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "No se pudieron guardar los montos.");
        return;
      }
      setEditando(null);
      refrescar();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(null);
    }
  }

  function exportarCsv() {
    const encabezado = ["Fecha", "Hora", "Paciente", "Cobertura", "Lugar", "Asistencia", "Monto cobertura", "Plus", "Total"];
    const filas = turnos.map((t) => {
      const fecha = new Date(t.inicio);
      const total = t.asistencia === "ASISTIO" ? (t.montoCobertura ?? 0) + (t.montoPlus ?? 0) : 0;
      return [
        formatDateParamBA(fecha),
        formatHoraBA(fecha),
        t.nombreYApellido,
        nombreCobertura(t.obraSocial),
        nombreLugar(t.lugarId),
        t.asistencia === "ASISTIO" ? "Asistió" : t.asistencia === "AUSENTE" ? "No vino" : "Sin marcar",
        t.montoCobertura ?? "",
        t.montoPlus ?? "",
        total,
      ];
    });
    const csv = [encabezado, ...filas]
      .map((fila) => fila.map((celda) => `"${String(celda).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    // BOM para que Excel abra bien los acentos.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ingresos-${mes}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mesAnterior = sumarMeses(mes, -1);
  const mesSiguiente = sumarMeses(mes, 1);
  const esFuturo = mes > mesActual;

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado y filtros */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Ingresos</h1>
          <p className="text-sm text-muted-foreground">
            Lo facturado según tus aranceles, por las consultas marcadas como asistidas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mes anterior"
              nativeButton={false}
              render={<Link href={hrefMes(mesAnterior, lugarId)} />}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-36 px-2 text-center text-sm font-semibold">{capitalizar(labelMes(mes))}</span>
            {mesSiguiente <= mesMaximo ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Mes siguiente"
                nativeButton={false}
                render={<Link href={hrefMes(mesSiguiente, lugarId)} />}
              >
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon-sm" aria-label="Mes siguiente" disabled>
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
          {lugares.length > 1 && (
            <Select
              value={lugarId ?? TODOS_LOS_LUGARES}
              onValueChange={(v) => {
                const nuevo = v === TODOS_LOS_LUGARES ? null : (v as string);
                startTransition(() => router.push(hrefMes(mes, nuevo)));
              }}
            >
              <SelectTrigger className="w-52" aria-label="Lugar de atención">
                <SelectValue>
                  {(v: string) => (v === TODOS_LOS_LUGARES ? "Todos los lugares" : nombreLugar(v))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS_LOS_LUGARES}>Todos los lugares</SelectItem>
                {lugares.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={exportarCsv} disabled={turnos.length === 0}>
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {sinAranceles && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <p className="min-w-0 flex-1">
            Te faltan cargar aranceles (consulta particular o lo que paga alguna cobertura). Las consultas
            sin monto suman $ 0.
          </p>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/configuracion?tab=perfil" />}>
            Cargar aranceles
          </Button>
        </div>
      )}

      <div className={cn("flex flex-col gap-5 transition-opacity", navegando && "opacity-60")}>
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Card className="col-span-2 lg:col-span-1">
            <CardContent className="flex flex-col gap-1 pt-1">
              <span className="text-xs font-medium text-muted-foreground">Total facturado</span>
              <span className="text-3xl font-semibold tabular-nums">{formatPesos(resumen.total)}</span>
              {proyectado > 0 && (
                <span className="text-xs text-muted-foreground">
                  + {formatPesos(proyectado)} estimado de {resumen.proximos}{" "}
                  {resumen.proximos === 1 ? "turno próximo" : "turnos próximos"}
                </span>
              )}
            </CardContent>
          </Card>
          <Kpi label="Particular" valor={formatPesos(resumen.particular)} />
          <Kpi label="Obras sociales y prepagas" valor={formatPesos(resumen.coberturas)} />
          <Kpi label="Plus" valor={formatPesos(resumen.plus)} />
          <Kpi
            label="Consultas"
            valor={String(resumen.atendidos)}
            detalle={
              tasaAusentismo !== null
                ? `${resumen.ausentes} ${resumen.ausentes === 1 ? "ausente" : "ausentes"} (${tasaAusentismo}%)`
                : undefined
            }
          />
        </div>

        {resumen.sinMarcar > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <Info className="size-4 shrink-0 text-primary" />
            <p className="min-w-0 flex-1">
              {resumen.sinMarcar === 1
                ? "Hay 1 turno pasado sin marcar: no suma hasta que indiques si vino."
                : `Hay ${resumen.sinMarcar} turnos pasados sin marcar: no suman hasta que indiques si vinieron.`}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={guardando !== null} onClick={() => setFiltro("sinMarcar")}>
                Revisar uno por uno
              </Button>
              <Button size="sm" disabled={guardando !== null} onClick={() => marcarTodos("ASISTIO")}>
                <Check className="size-4" />
                {guardando === "todos" ? "Marcando..." : "Marcar todos como asistidos"}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos 6 meses</CardTitle>
            </CardHeader>
            <CardContent>
              <EvolucionChart evolucion={evolucion} mesSeleccionado={mes} lugarId={lugarId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Por cobertura</CardTitle>
            </CardHeader>
            <CardContent>
              {resumen.porCobertura.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {esFuturo ? "Este mes todavía no empezó." : "Todavía no hay consultas asistidas este mes."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cobertura</TableHead>
                      <TableHead className="text-right">Consultas</TableHead>
                      <TableHead className="text-right">Arancel</TableHead>
                      <TableHead className="text-right">Plus</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.porCobertura.map((fila) => (
                      <TableRow key={fila.cobertura}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-1.5">
                            {fila.cobertura}
                            {fila.sinMonto > 0 && (
                              <span
                                title={`${fila.sinMonto} sin monto cargado`}
                                className="text-amber-700 dark:text-amber-400"
                              >
                                <AlertTriangle className="size-3.5" aria-label={`${fila.sinMonto} sin monto cargado`} />
                              </span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{fila.consultas}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatPesos(fila.monto)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fila.plus ? formatPesos(fila.plus) : "—"}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatPesos(fila.total)}
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            {resumen.total > 0 ? `${Math.round((fila.total / resumen.total) * 100)}%` : ""}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">{resumen.atendidos}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPesos(resumen.particular + resumen.coberturas)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatPesos(resumen.plus)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatPesos(resumen.total)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalle de turnos */}
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Turnos del mes</CardTitle>
            <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filtrar turnos">
              {(
                [
                  ["todos", `Todos (${turnos.length})`],
                  ["sinMarcar", `Sin marcar (${resumen.sinMarcar})`],
                  ["atendidos", `Asistieron (${resumen.atendidos})`],
                  ["ausentes", `No vinieron (${resumen.ausentes})`],
                ] as const
              ).map(([valor, label]) => (
                <button
                  key={valor}
                  type="button"
                  role="tab"
                  aria-selected={filtro === valor}
                  onClick={() => setFiltro(valor)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    filtro === valor
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {turnosFiltrados.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay turnos para mostrar.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {turnosFiltrados.map((t) => {
                  const fecha = new Date(t.inicio);
                  const marcable = esMarcable(t);
                  const enEdicion = editando?.id === t.id;
                  return (
                    <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                      <span className="w-20 shrink-0 text-sm tabular-nums text-muted-foreground">
                        {formatFechaCorta(t.inicio)} · {formatHoraBA(fecha)}
                      </span>
                      <span className="flex min-w-0 flex-1 basis-40 flex-col">
                        <span className="truncate text-sm font-medium">{t.nombreYApellido}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {nombreCobertura(t.obraSocial)}
                          {lugares.length > 1 && !lugarId ? ` · ${nombreLugar(t.lugarId)}` : ""}
                        </span>
                      </span>

                      {t.asistencia === "ASISTIO" && !enEdicion && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditando({
                              id: t.id,
                              cobertura: t.montoCobertura != null ? String(t.montoCobertura) : "",
                              plus: t.montoPlus != null ? String(t.montoPlus) : "",
                            })
                          }
                          className="group flex items-center gap-1.5 rounded-md px-2 py-1 text-right text-sm tabular-nums hover:bg-muted"
                          aria-label={`Editar montos de ${t.nombreYApellido}`}
                        >
                          {t.montoCobertura == null && t.montoPlus == null ? (
                            <span className="text-amber-700 dark:text-amber-400">Sin monto</span>
                          ) : (
                            <span>
                              <span className="font-semibold">
                                {formatPesos((t.montoCobertura ?? 0) + (t.montoPlus ?? 0))}
                              </span>
                              {t.montoPlus ? (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  (incl. {formatPesos(t.montoPlus)} plus)
                                </span>
                              ) : null}
                            </span>
                          )}
                          <Pencil className="size-3.5 text-muted-foreground opacity-60 group-hover:opacity-100" />
                        </button>
                      )}

                      {enEdicion && (
                        <div className="flex flex-wrap items-center gap-2">
                          <MontoCampo
                            label="Arancel"
                            value={editando.cobertura}
                            onChange={(v) => setEditando({ ...editando, cobertura: v })}
                          />
                          <MontoCampo
                            label="Plus"
                            value={editando.plus}
                            onChange={(v) => setEditando({ ...editando, plus: v })}
                          />
                          <Button size="sm" onClick={guardarMontos} disabled={guardando === t.id}>
                            Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditando(null)}>
                            Cancelar
                          </Button>
                        </div>
                      )}

                      {marcable ? (
                        <div className="flex gap-1.5" role="group" aria-label={`Asistencia de ${t.nombreYApellido}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            aria-pressed={t.asistencia === "ASISTIO"}
                            disabled={guardando !== null}
                            onClick={() => marcar(t, "ASISTIO")}
                            className={cn(
                              t.asistencia === "ASISTIO" &&
                                "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                            )}
                          >
                            <Check className="size-3.5" />
                            Asistió
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            aria-pressed={t.asistencia === "AUSENTE"}
                            disabled={guardando !== null}
                            onClick={() => marcar(t, "AUSENTE")}
                            className={cn(
                              t.asistencia === "AUSENTE" &&
                                "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/15"
                            )}
                          >
                            <UserX className="size-3.5" />
                            No vino
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Próximo</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Es lo facturado según los aranceles que cargaste, no lo efectivamente cobrado: las obras sociales
          suelen pagar a 30-90 días y pueden aplicar débitos. Cambiar un arancel no modifica las consultas ya
          marcadas.
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, valor, detalle }: { label: string; valor: string; detalle?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold tabular-nums">{valor}</span>
        {detalle && <span className="text-xs text-muted-foreground">{detalle}</span>}
      </CardContent>
    </Card>
  );
}

function MontoCampo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-32">
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-xs text-muted-foreground">
        $
      </span>
      <Input
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        placeholder={label}
        value={value ? Number(value).toLocaleString("es-AR") : ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9))}
        className="h-8 pl-6 text-sm tabular-nums"
      />
    </div>
  );
}

// Barras de una sola serie (total facturado por mes); el desglose va en el
// tooltip. El mes elegido se resalta, los demás quedan atenuados y llevan a
// ese mes al tocarlos.
function EvolucionChart({
  evolucion,
  mesSeleccionado,
  lugarId,
}: {
  evolucion: { mes: string; particular: number; coberturas: number; plus: number; total: number }[];
  mesSeleccionado: string;
  lugarId: string | null;
}) {
  const maximo = Math.max(...evolucion.map((e) => e.total), 1);
  const sinDatos = evolucion.every((e) => e.total === 0);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-44 items-end gap-3 border-b border-border">
        {sinDatos && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Sin consultas asistidas en estos meses.
          </p>
        )}
        {evolucion.map((e) => {
          const seleccionado = e.mes === mesSeleccionado;
          const alto = e.total > 0 ? Math.max((e.total / maximo) * 100, 2) : 0;
          return (
            <Link
              key={e.mes}
              href={hrefMes(e.mes, lugarId)}
              aria-label={`${labelMes(e.mes)}: ${formatPesos(e.total)}`}
              className="group relative flex h-full flex-1 items-end justify-center rounded-t outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span
                className={cn(
                  "w-full max-w-10 rounded-t transition-colors",
                  seleccionado ? "bg-primary" : "bg-primary/35 group-hover:bg-primary/55"
                )}
                style={{ height: `${alto}%` }}
              />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max -translate-x-1/2 flex-col gap-0.5 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md group-hover:flex group-focus-visible:flex"
              >
                <strong className="font-semibold">{capitalizar(labelMes(e.mes))}</strong>
                <span className="tabular-nums">Total: {formatPesos(e.total)}</span>
                <span className="tabular-nums text-muted-foreground">Particular: {formatPesos(e.particular)}</span>
                <span className="tabular-nums text-muted-foreground">Coberturas: {formatPesos(e.coberturas)}</span>
                <span className="tabular-nums text-muted-foreground">Plus: {formatPesos(e.plus)}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <div className="flex gap-3">
        {evolucion.map((e) => (
          <span
            key={e.mes}
            className={cn(
              "flex-1 text-center text-xs",
              e.mes === mesSeleccionado ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            {capitalizar(labelMesCorto(e.mes))}
          </span>
        ))}
      </div>
    </div>
  );
}
