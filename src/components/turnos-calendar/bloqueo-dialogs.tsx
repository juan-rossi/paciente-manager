"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateParamToDateBA, formatHoraBA } from "@/lib/timezone";
import type { UserRole } from "@/lib/auth";
import type { BloqueDelDia } from "@/lib/bloques-dia";
import type { BloqueoDelDia, LugarInfo, Slot } from "./types";
import { capitalize, formatHora, lugarNombre } from "./utils";
import type { BloqueoState } from "./use-bloqueo";

// Diálogos de "Bloquear horarios" (con el wizard de conflictos) y de
// "Desbloquear horario".
export function BloqueoDialogs({ state, role, selectedDate, bloques, lugaresPorId, bloqueosDelDia }: {
  state: BloqueoState;
  role: UserRole;
  selectedDate: Date;
  bloques: BloqueDelDia<Slot>[];
  lugaresPorId: Map<string, LugarInfo>;
  bloqueosDelDia: BloqueoDelDia[];
}) {
  const {
    bloqueoOpen,
    setBloqueoOpen,
    bloqueoModo,
    setBloqueoModo,
    bloqueoBloqueKeys,
    bloqueoMotivo,
    setBloqueoMotivo,
    bloqueoSaving,
    bloqueoError,
    bloqueoStep,
    bloqueoConflictoBloques,
    bloqueoWizardIndex,
    unblockingId,
    unblockTarget,
    setUnblockTarget,
    toggleBloqueKey,
    handleSubmitBloqueo,
    updateBloqueoCurrentResolucion,
    handleBloqueoAnterior,
    handleConfirmResolucion,
    handleConfirmUnblock,
    bloqueoCurrentBloque,
    bloqueoCurrentResolucion,
    bloqueoIsLastBloque,
    bloqueoFechasDelBloqueActual,
  } = state;

  return (
    <>
      <Dialog open={bloqueoOpen} onOpenChange={(open) => !open && setBloqueoOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {bloqueoStep === "conflicto" ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBloqueoAnterior}
                  aria-label="Anterior"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <DialogTitle>Hay turnos en este horario</DialogTitle>
              </div>
            ) : (
              <DialogTitle>Bloquear horarios</DialogTitle>
            )}
          </DialogHeader>
          {bloqueoStep === "conflicto" && bloqueoCurrentBloque && bloqueoCurrentResolucion ? (
            <div className="flex flex-col gap-4">
              {bloqueoConflictoBloques.length > 1 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Bloque {bloqueoWizardIndex + 1} de {bloqueoConflictoBloques.length}
                  </span>
                  <div className="flex gap-1">
                    {bloqueoConflictoBloques.map((b, i) => (
                      <div
                        key={b.key}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          i <= bloqueoWizardIndex ? "bg-primary" : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">
                    {lugarNombre(lugaresPorId.get(bloqueoCurrentBloque.lugarId))}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {formatHora(bloqueoCurrentBloque.inicio)} a {formatHora(bloqueoCurrentBloque.fin)}
                    </span>
                  </span>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Hay <strong className="text-foreground">{bloqueoCurrentBloque.turnos.length}</strong> turno
                {bloqueoCurrentBloque.turnos.length === 1 ? "" : "s"} programado
                {bloqueoCurrentBloque.turnos.length === 1 ? "" : "s"} en ese horario. Elegí qué hacer con
                {bloqueoCurrentBloque.turnos.length === 1 ? " él" : " ellos"}.
              </p>

              <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border/60 p-2">
                {bloqueoCurrentBloque.turnos.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 px-1 text-sm">
                    <span className="font-medium">{t.nombreYApellido}</span>
                    <span className="text-muted-foreground">{formatHoraBA(new Date(t.inicio))}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {(
                  [
                    {
                      value: "cancelar" as const,
                      titulo: "Cancelar los turnos",
                      detalle: "Se cancelan y cada paciente queda pendiente de aviso en Recordatorios.",
                    },
                    {
                      value: "mover_dia_libre" as const,
                      titulo: "Mover a un día libre",
                      detalle: "Elegí a qué día sin horario configurado se reprograma.",
                    },
                    {
                      value: "mover_siguiente_libre" as const,
                      titulo: "Mover al primer horario libre",
                      detalle: "Se reacomodan al próximo lugar disponible en la agenda, sin dejar huecos.",
                    },
                  ]
                ).map((opcion) => {
                  const selected = bloqueoCurrentResolucion.resolucion === opcion.value;
                  return (
                    <div
                      key={opcion.value}
                      className={cn(
                        "flex flex-col gap-2.5 rounded-lg border p-3 transition-colors",
                        selected ? "border-primary bg-primary/5" : "border-border/60 hover:bg-accent/40"
                      )}
                    >
                      <label className="flex cursor-pointer items-start gap-2.5">
                        <input
                          type="radio"
                          name="bloqueo-resolucion"
                          value={opcion.value}
                          checked={selected}
                          onChange={() => updateBloqueoCurrentResolucion({ resolucion: opcion.value })}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-semibold">{opcion.titulo}</span>
                          <span className="block text-xs text-muted-foreground">{opcion.detalle}</span>
                        </span>
                      </label>
                      {selected && opcion.value === "mover_dia_libre" && (
                        <div className="ml-7 flex flex-col gap-2">
                          {bloqueoFechasDelBloqueActual.length === 0 ? (
                            <p className="text-xs text-destructive">
                              No hay ningún día sin horario configurado para reprogramar estos turnos.
                            </p>
                          ) : (
                            <Select
                              value={bloqueoCurrentResolucion.diaLibreElegido}
                              onValueChange={(v) => v && updateBloqueoCurrentResolucion({ diaLibreElegido: v })}
                            >
                              <SelectTrigger className="w-full bg-card">
                                <SelectValue>
                                  {() => {
                                    const fecha = bloqueoCurrentResolucion.diaLibreElegido;
                                    return fecha
                                      ? capitalize(
                                          dateParamToDateBA(fecha)!.toLocaleDateString("es-AR", {
                                            weekday: "long",
                                            day: "numeric",
                                            month: "long",
                                            year: "numeric",
                                          })
                                        )
                                      : "Elegí un día";
                                  }}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {bloqueoFechasDelBloqueActual.map((fecha) => (
                                  <SelectItem key={fecha} value={fecha}>
                                    {capitalize(
                                      dateParamToDateBA(fecha)!.toLocaleDateString("es-AR", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                      })
                                    )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          <div className="mt-1 flex flex-col gap-2.5 border-t border-border/60 pt-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0">
                                <Label htmlFor="bloqueo-horarios-consecutivos" className="text-xs font-semibold">
                                  Horarios consecutivos
                                </Label>
                                <span className="block text-[11px] text-muted-foreground">
                                  Se acomodan uno tras otro desde el inicio del bloque, en vez de conservar el
                                  horario original.
                                </span>
                              </span>
                              <Switch
                                id="bloqueo-horarios-consecutivos"
                                checked={bloqueoCurrentResolucion.horariosConsecutivos}
                                onCheckedChange={(checked) =>
                                  updateBloqueoCurrentResolucion({ horariosConsecutivos: checked })
                                }
                              />
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="min-w-0">
                                <Label htmlFor="bloqueo-habilitar-turnos-nuevos" className="text-xs font-semibold">
                                  Habilitar turnos nuevos ese día
                                </Label>
                                <span className="block text-[11px] text-muted-foreground">
                                  Solo esta fecha puntual va a poder reservarse (panel y directorio) -- no afecta
                                  otras semanas.
                                </span>
                              </span>
                              <Switch
                                id="bloqueo-habilitar-turnos-nuevos"
                                checked={bloqueoCurrentResolucion.habilitarTurnosNuevos}
                                onCheckedChange={(checked) =>
                                  updateBloqueoCurrentResolucion({ habilitarTurnosNuevos: checked })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {bloqueoError && <p className="text-sm text-destructive">{bloqueoError}</p>}
            </div>
          ) : bloqueoStep === "conflicto" ? null : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label>Día</Label>
              <strong className="text-sm">{selectedDate.toLocaleDateString("es-AR")}</strong>
            </div>

            <Tabs value={bloqueoModo} onValueChange={(v) => setBloqueoModo(v as "dia" | "bloques")}>
              {role === "DOCTOR" && (
                <TabsList className="w-full">
                  <TabsTrigger value="dia" className="flex-1">
                    Día completo
                  </TabsTrigger>
                  <TabsTrigger value="bloques" className="flex-1">
                    Horarios específicos
                  </TabsTrigger>
                </TabsList>
              )}
              <TabsContent value="dia" className="mt-3">
                <p className="text-sm text-muted-foreground">
                  {role === "DOCTOR"
                    ? "Se va a bloquear toda tu agenda de este día, en todos tus lugares."
                    : "Se va a bloquear todo el día en tu lugar activo."}
                </p>
              </TabsContent>
              <TabsContent value="bloques" className="mt-3">
                <div className="flex flex-col gap-2.5 rounded-lg border border-border/60 bg-muted/50 p-3">
                  {bloques.map((bloque) => {
                    const yaBloqueado = bloqueosDelDia.some(
                      (b) =>
                        (b.lugarId === null || b.lugarId === bloque.lugarId) &&
                        b.inicio <= bloque.inicio &&
                        b.fin >= bloque.fin
                    );
                    return (
                      <div key={bloque.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`bloqueo-bloque-${bloque.key}`}
                          checked={yaBloqueado || bloqueoBloqueKeys.includes(bloque.key)}
                          disabled={yaBloqueado}
                          onCheckedChange={(checked) => toggleBloqueKey(bloque.key, checked === true)}
                        />
                        <Label htmlFor={`bloqueo-bloque-${bloque.key}`} className="font-normal">
                          {lugarNombre(lugaresPorId.get(bloque.lugarId))}
                          <span className="text-muted-foreground">
                            {" "}
                            · {formatHora(bloque.inicio)} a {formatHora(bloque.fin)}
                          </span>
                          {yaBloqueado && (
                            <span className="text-muted-foreground"> (ya bloqueado)</span>
                          )}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-col gap-1.5">
              <Label>
                Motivo <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                value={bloqueoMotivo}
                onChange={(e) => setBloqueoMotivo(e.target.value)}
                placeholder="Ej: Congreso, día libre..."
              />
            </div>
            {bloqueoError && <p className="text-sm text-destructive">{bloqueoError}</p>}
          </div>
          )}
          <DialogFooter>
            {bloqueoStep === "conflicto" ? (
              <>
                <Button type="button" variant="outline" onClick={handleBloqueoAnterior}>
                  Anterior
                </Button>
                <Button type="button" onClick={handleConfirmResolucion} disabled={bloqueoSaving}>
                  {bloqueoSaving
                    ? "Confirmando..."
                    : bloqueoIsLastBloque
                      ? "Confirmar"
                      : "Siguiente"}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={handleSubmitBloqueo} disabled={bloqueoSaving}>
                {bloqueoSaving ? "Bloqueando..." : "Bloquear"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unblockTarget !== null} onOpenChange={(open) => !open && setUnblockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desbloquear horario</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            {unblockTarget && (
              <>
                ¿Desbloquear <strong>{unblockTarget.label}</strong>?
              </>
            )}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUnblockTarget(null)}>
              Volver
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUnblock}
              disabled={unblockingId === unblockTarget?.bloqueoId}
            >
              {unblockingId === unblockTarget?.bloqueoId ? "Desbloqueando..." : "Desbloquear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
