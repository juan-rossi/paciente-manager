"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ObraSocialSelect } from "@/components/obra-social-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, UserX } from "lucide-react";
import { DNI_REGEX } from "@/lib/dni";
import { formatDateParamBA } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { ESTADO_VISUAL_LABELS, estadoVisualTurno } from "@/lib/turno-estado";
import { filterTelefono } from "@/lib/utils";
import { EstadoTurnoIcono, formatHora } from "./utils";
import type { TurnoFormState } from "./use-turno-form";

// Diálogos de reservar/editar turno y de cancelarlo.
export function TurnoDialogs({ state, selectedDate, prepagas }: {
  state: TurnoFormState;
  selectedDate: Date;
  prepagas: string[];
}) {
  const {
    formSlot,
    setFormSlot,
    editingTurnoId,
    nombreYApellido,
    setNombreYApellido,
    dni,
    setDni,
    telefono,
    setTelefono,
    obraSocial,
    setObraSocial,
    saving,
    error,
    triedSubmit,
    cancelTarget,
    setCancelTarget,
    cancelling,
    togglingConfirmado,
    handleToggleConfirmado,
    guardandoAsistencia,
    handleSetAsistencia,
    handleSubmitForm,
    handleCancelar,
  } = state;
  const estado = editingTurnoId && formSlot?.turno ? estadoVisualTurno(formSlot.turno) : null;
  // La asistencia se marca desde el día del turno en adelante.
  const asistencia = formSlot?.turno?.asistencia ?? null;
  const puedeMarcarAsistencia =
    !!editingTurnoId && !!formSlot?.turno && formatDateParamBA(selectedDate) <= formatDateParamBA(new Date());

  return (
    <>
      <Dialog open={formSlot !== null} onOpenChange={(open) => !open && setFormSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTurnoId ? "Editar turno" : "Reservar turno"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label>Día</Label>
                <strong className="text-sm">
                  {selectedDate.toLocaleDateString("es-AR")}
                </strong>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Hora</Label>
                <strong className="text-sm">
                  {formSlot && `${formatHora(formSlot.inicio)} a ${formatHora(formSlot.fin)}`}
                </strong>
              </div>
            </div>
            {estado && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <EstadoTurnoIcono estado={estado} />
                  <span>
                    <span className="text-muted-foreground">Estado:</span>{" "}
                    <strong className="font-semibold">{ESTADO_VISUAL_LABELS[estado]}</strong>
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleConfirmado}
                  disabled={togglingConfirmado}
                >
                  {estado === "CONFIRMADO" ? "Quitar confirmación" : "Marcar confirmado"}
                </Button>
              </div>
            )}
            {puedeMarcarAsistencia && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-sm text-muted-foreground">¿Vino al turno?</span>
                <div className="flex gap-2" role="group" aria-label="Asistencia">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={asistencia === "ASISTIO"}
                    disabled={guardandoAsistencia}
                    onClick={() => handleSetAsistencia("ASISTIO")}
                    className={cn(
                      asistencia === "ASISTIO" &&
                        "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                    )}
                  >
                    <Check className="size-3.5" />
                    Asistió
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={asistencia === "AUSENTE"}
                    disabled={guardandoAsistencia}
                    onClick={() => handleSetAsistencia("AUSENTE")}
                    className={cn(
                      asistencia === "AUSENTE" &&
                        "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/15"
                    )}
                  >
                    <UserX className="size-3.5" />
                    No vino
                  </Button>
                </div>
              </div>
            )}
            <hr className="mt-2 mb-2" />
            <div className="flex flex-col gap-1.5">
              <Label>Nombre completo *</Label>
              <Input
                value={nombreYApellido}
                onChange={(e) => setNombreYApellido(e.target.value)}
                className={
                  triedSubmit && !nombreYApellido.trim() ? "border-destructive" : undefined
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>DNI *</Label>
                <Input
                  inputMode="numeric"
                  maxLength={8}
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
                  className={
                    triedSubmit && !DNI_REGEX.test(dni) ? "border-destructive" : undefined
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Teléfono *</Label>
                <Input
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(filterTelefono(e.target.value))}
                  className={triedSubmit && !telefono.trim() ? "border-destructive" : undefined}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Obra Social</Label>
              <ObraSocialSelect value={obraSocial} onChange={setObraSocial} prepagas={prepagas} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className={editingTurnoId ? "sm:justify-between" : undefined}>
            {editingTurnoId && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setCancelTarget(formSlot);
                  setFormSlot(null);
                }}
              >
                Cancelar turno
              </Button>
            )}
            <Button type="button" onClick={handleSubmitForm} disabled={saving}>
              {saving
                ? editingTurnoId
                  ? "Guardando..."
                  : "Reservando..."
                : editingTurnoId
                  ? "Guardar"
                  : "Reservar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelTarget !== null} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar turno</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            {cancelTarget?.turno && (
              <>
                ¿Cancelar el turno de <strong>{cancelTarget.turno.nombreYApellido}</strong> del{" "}
                {selectedDate.toLocaleDateString("es-AR")} a las {formatHora(cancelTarget.inicio)}?
              </>
            )}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelTarget(null)}>
              Volver
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelar}
              disabled={cancelling}
            >
              {cancelling ? "Cancelando..." : "Cancelar turno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
