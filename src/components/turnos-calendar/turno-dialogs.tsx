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
import { DNI_REGEX } from "@/lib/dni";
import { filterTelefono } from "@/lib/utils";
import { formatHora } from "./utils";
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
    handleSubmitForm,
    handleCancelar,
  } = state;

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
