"use client";

import Link from "next/link";
import { CircleCheck, MapPin, MessageCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopiarLinkSala } from "@/components/teleconsulta/copiar-link-sala";
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
import { buildMensajeCambioModalidad, buildWhatsAppHref } from "@/lib/recordatorio-mensaje";
import { ESTADO_VISUAL_LABELS, estadoVisualTurno } from "@/lib/turno-estado";
import { filterTelefono } from "@/lib/utils";
import { EstadoTurnoIcono, formatHora } from "./utils";
import type { TurnoFormState } from "./use-turno-form";

// Diálogos de reservar/editar turno y de cancelarlo.
export function TurnoDialogs({ state, selectedDate, prepagas, lugarTipo, esMedico, teleconsultaHabilitada }: {
  state: TurnoFormState;
  selectedDate: Date;
  prepagas: string[];
  // Tipo del lugar del turno abierto: un turno de un lugar VIRTUAL es
  // siempre teleconsulta y no se puede pasar a presencial.
  lugarTipo?: string;
  esMedico: boolean;
  teleconsultaHabilitada: boolean;
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
    handleSubmitForm,
    handleCancelar,
    modalidadTarget,
    setModalidadTarget,
    consentimientoRemoto,
    setConsentimientoRemoto,
    cambiandoModalidad,
    modalidadError,
    openCambioModalidad,
    handleCambiarModalidad,
    teleconsultaExito,
    setTeleconsultaExito,
    handleAvisoTeleconsultaEnviado,
  } = state;
  const estado = editingTurnoId && formSlot?.turno ? estadoVisualTurno(formSlot.turno) : null;
  const turnoAbierto = editingTurnoId && formSlot?.turno?.estado !== "CANCELADO" ? formSlot?.turno : null;
  // Pasar a teleconsulta / volver a presencial: solo turnos que todavía no
  // terminaron y que no son de un lugar de Teleconsulta (esos son siempre
  // por videollamada).
  const puedeCambiarModalidad =
    teleconsultaHabilitada &&
    !!turnoAbierto &&
    lugarTipo !== "VIRTUAL" &&
    !!formSlot &&
    new Date(formSlot.fin) > new Date();
  const aTeleconsulta = !modalidadTarget?.turno?.teleconsulta;
  const whatsappTeleconsultaHref = teleconsultaExito
    ? buildWhatsAppHref(
        teleconsultaExito.telefono,
        buildMensajeCambioModalidad(teleconsultaExito.nombreYApellido, new Date(teleconsultaExito.inicio), {
          aTeleconsulta: true,
          links: teleconsultaExito.links,
        })
      )
    : null;

  return (
    <>
      <Dialog open={formSlot !== null} onOpenChange={(open) => !open && setFormSlot(null)}>
        {/* Una teleconsulta necesita más ancho: las tres acciones de la sala
            (volver a presencial, copiar link, ir a la sala) van en una línea. */}
        <DialogContent className={editingTurnoId && turnoAbierto?.teleconsulta ? "sm:max-w-[33rem]" : undefined}>
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
            {turnoAbierto && !turnoAbierto.teleconsulta && puedeCambiarModalidad && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span>
                    <span className="text-muted-foreground">Modalidad:</span>{" "}
                    <strong className="font-semibold">Presencial</strong>
                  </span>
                </span>
                <Button type="button" variant="outline" size="sm" onClick={openCambioModalidad}>
                  <Video className="size-4" />
                  Pasar a teleconsulta
                </Button>
              </div>
            )}
            {editingTurnoId && turnoAbierto?.teleconsulta && (
              <div className="flex flex-col gap-2.5 rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2.5">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Video className="size-4 text-sky-600" />
                  Teleconsulta
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  {puedeCambiarModalidad && (
                    <Button type="button" variant="outline" size="sm" onClick={openCambioModalidad}>
                      <MapPin className="size-4" />
                      Volver a presencial
                    </Button>
                  )}
                  <CopiarLinkSala turnoId={editingTurnoId} />
                  {esMedico && (
                    <Button
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/turnos/${editingTurnoId}/sala`} />}
                    >
                      <Video className="size-4" />
                      Ir a la sala
                    </Button>
                  )}
                </span>
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

      <Dialog
        open={modalidadTarget !== null}
        onOpenChange={(open) => !open && !cambiandoModalidad && setModalidadTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{aTeleconsulta ? "Pasar a teleconsulta" : "Volver a presencial"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {modalidadTarget?.turno && (
              <p className="text-sm">
                El turno de <strong>{modalidadTarget.turno.nombreYApellido}</strong> del{" "}
                {selectedDate.toLocaleDateString("es-AR")} a las {formatHora(modalidadTarget.inicio)}{" "}
                {aTeleconsulta
                  ? "pasa a ser por videollamada. Mantiene el día, la hora y el lugar en la agenda."
                  : "vuelve a ser presencial, en el mismo día, hora y lugar."}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Va a quedar en <strong className="font-medium text-foreground">Pendientes de notificar</strong>{" "}
              (Recordatorios) con el mensaje listo para avisarle por WhatsApp
              {aTeleconsulta ? ", junto con el link de la videollamada." : "."}
            </p>
            {aTeleconsulta && (
              <div className="flex items-start gap-2.5 rounded-md border border-border p-3">
                <Checkbox
                  id="consentimiento-remoto-turno"
                  checked={consentimientoRemoto}
                  onCheckedChange={(checked) => setConsentimientoRemoto(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="consentimiento-remoto-turno" className="block text-sm leading-snug font-normal">
                  El paciente aceptó ser atendido por videollamada
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Queda registrado en la sala de la teleconsulta.
                  </span>
                </Label>
              </div>
            )}
            {modalidadError && <p className="text-sm text-destructive">{modalidadError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalidadTarget(null)}
              disabled={cambiandoModalidad}
            >
              Volver
            </Button>
            <Button type="button" onClick={handleCambiarModalidad} disabled={cambiandoModalidad}>
              {cambiandoModalidad
                ? "Guardando..."
                : aTeleconsulta
                  ? "Pasar a teleconsulta"
                  : "Volver a presencial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={teleconsultaExito !== null} onOpenChange={(open) => !open && setTeleconsultaExito(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turno pasado a teleconsulta</DialogTitle>
          </DialogHeader>
          {teleconsultaExito && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                <p className="text-sm">
                  El turno de <strong>{teleconsultaExito.nombreYApellido}</strong> del{" "}
                  {selectedDate.toLocaleDateString("es-AR")} a las {formatHora(teleconsultaExito.inicio)} ahora
                  es por videollamada.
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Avisale ahora por WhatsApp con el link de la sala. Si preferís hacerlo más tarde, queda en{" "}
                <strong className="font-medium text-foreground">Pendientes de notificar</strong> (Recordatorios).
              </p>
              <CopiarLinkSala turnoId={teleconsultaExito.turnoId} />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTeleconsultaExito(null)}>
              Avisar más tarde
            </Button>
            {whatsappTeleconsultaHref && (
              <Button
                nativeButton={false}
                render={<a href={whatsappTeleconsultaHref} target="_blank" rel="noopener noreferrer" />}
                onClick={handleAvisoTeleconsultaEnviado}
              >
                <MessageCircle className="size-4" />
                Enviar por WhatsApp
              </Button>
            )}
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
