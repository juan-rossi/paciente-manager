"use client";

import { useState } from "react";
import { DNI_ERROR_MESSAGE, DNI_REGEX } from "@/lib/dni";
import type { Slot } from "./types";

// Estado y acciones del diálogo de reservar/editar turno y del de
// cancelarlo. Vive en `TurnosCalendar` (se llama desde ahí), así que su
// estado se conserva igual que cuando estaba escrito adentro del componente.
export function useTurnoForm({ selectedDate, loadSlots }: {
  selectedDate: Date;
  loadSlots: (date: Date) => Promise<void>;
}) {
  const [formSlot, setFormSlot] = useState<Slot | null>(null);
  const [editingTurnoId, setEditingTurnoId] = useState<string | null>(null);
  const [nombreYApellido, setNombreYApellido] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  const [obraSocial, setObraSocial] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Slot | null>(null);
  const [cancelling, setCancelling] = useState(false);

  function openBooking(slot: Slot) {
    setFormSlot(slot);
    setEditingTurnoId(null);
    setNombreYApellido("");
    setDni("");
    setTelefono("");
    setObraSocial("");
    setError(null);
    setTriedSubmit(false);
  }

  function openEdit(slot: Slot) {
    if (!slot.turno) return;
    setFormSlot(slot);
    setEditingTurnoId(slot.turno.id);
    setNombreYApellido(slot.turno.nombreYApellido);
    setDni(slot.turno.dni ?? "");
    setTelefono(slot.turno.telefono);
    setObraSocial(slot.turno.obraSocial ?? "");
    setError(null);
    setTriedSubmit(false);
  }

  async function handleSubmitForm() {
    if (!formSlot) return;
    if (!nombreYApellido.trim() || !dni.trim() || !telefono.trim()) {
      setTriedSubmit(true);
      setError("Completá nombre, DNI y teléfono.");
      return;
    }
    if (!DNI_REGEX.test(dni)) {
      setTriedSubmit(true);
      setError(DNI_ERROR_MESSAGE);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(
        editingTurnoId ? `/api/turnos/${editingTurnoId}` : "/api/turnos",
        {
          method: editingTurnoId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inicio: formSlot.inicio,
            nombreYApellido,
            dni,
            telefono,
            obraSocial,
            ...(editingTurnoId ? {} : { lugarId: formSlot.lugarId }),
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el turno.");
        return;
      }
      setFormSlot(null);
      await loadSlots(selectedDate);
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelar() {
    if (!cancelTarget?.turno) return;
    setCancelling(true);
    try {
      await fetch(`/api/turnos/${cancelTarget.turno.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "CANCELADO" }),
      });
      setCancelTarget(null);
      await loadSlots(selectedDate);
    } finally {
      setCancelling(false);
    }
  }

  return {
    formSlot,
    setFormSlot,
    editingTurnoId,
    setEditingTurnoId,
    nombreYApellido,
    setNombreYApellido,
    dni,
    setDni,
    telefono,
    setTelefono,
    obraSocial,
    setObraSocial,
    saving,
    setSaving,
    error,
    setError,
    triedSubmit,
    setTriedSubmit,
    cancelTarget,
    setCancelTarget,
    cancelling,
    setCancelling,
    openBooking,
    openEdit,
    handleSubmitForm,
    handleCancelar,
  };
}

export type TurnoFormState = ReturnType<typeof useTurnoForm>;
