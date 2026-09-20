"use client";

import { useState } from "react";
import { Building2, MapPin, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsSection } from "@/components/settings-section";
import { AddressAutocomplete, type AddressResult } from "@/components/address-autocomplete";

type LugarTrabajoTipo = "PARTICULAR" | "CONSULTORIO";

type LugarDeTrabajo = {
  id: string;
  tipo: LugarTrabajoTipo;
  nombre: string | null;
  direccion: string;
  telefono: string;
  latitud: number | null;
  longitud: number | null;
};

type Props = {
  initialLugares: LugarDeTrabajo[];
};

export function MiPracticaSettings({ initialLugares }: Props) {
  const [lugares, setLugares] = useState<LugarDeTrabajo[]>(initialLugares);

  const [open, setOpen] = useState(false);
  const [editingLugar, setEditingLugar] = useState<LugarDeTrabajo | null>(null);
  const [tipo, setTipo] = useState<LugarTrabajoTipo>("CONSULTORIO");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [telefono, setTelefono] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<LugarDeTrabajo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hayParticular = lugares.some((l) => l.tipo === "PARTICULAR");

  function openCreate() {
    setEditingLugar(null);
    setTipo(hayParticular ? "CONSULTORIO" : "PARTICULAR");
    setNombre("");
    setDireccion("");
    setLatitud(null);
    setLongitud(null);
    setTelefono("");
    setError(null);
    setTriedSubmit(false);
    setOpen(true);
  }

  function openEdit(lugar: LugarDeTrabajo) {
    setEditingLugar(lugar);
    setTipo(lugar.tipo);
    setNombre(lugar.nombre ?? "");
    setDireccion(lugar.direccion);
    setLatitud(lugar.latitud);
    setLongitud(lugar.longitud);
    setTelefono(lugar.telefono);
    setError(null);
    setTriedSubmit(false);
    setOpen(true);
  }

  function handleDireccionTextChange(text: string) {
    setDireccion(text);
    setLatitud(null);
    setLongitud(null);
  }

  function handleDireccionSelect(result: AddressResult) {
    setDireccion(result.direccion);
    setLatitud(result.latitud);
    setLongitud(result.longitud);
  }

  // El radio "Particular" solo se puede elegir si no hay otro particular
  // cargado, o si el que se está editando es justamente ese.
  const particularDeshabilitado =
    hayParticular && editingLugar?.tipo !== "PARTICULAR";

  async function handleGuardar() {
    if (!direccion.trim() || !telefono.trim() || (tipo === "CONSULTORIO" && !nombre.trim())) {
      setTriedSubmit(true);
      setError("Completá los campos obligatorios.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(
        editingLugar ? `/api/lugares-trabajo/${editingLugar.id}` : "/api/lugares-trabajo",
        {
          method: editingLugar ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo,
            nombre: tipo === "CONSULTORIO" ? nombre : undefined,
            direccion,
            telefono,
            latitud,
            longitud,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el lugar.");
        return;
      }
      setLugares((prev) =>
        editingLugar
          ? prev.map((l) => (l.id === data.lugar.id ? data.lugar : l))
          : [...prev, data.lugar]
      );
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleEliminar() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`/api/lugares-trabajo/${deleteTarget.id}`, { method: "DELETE" });
      setLugares((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsSection
      title="Mi práctica"
      description="Cargá los lugares donde atendés. Podés tener un lugar particular y uno o más consultorios."
      icon={Building2}
    >
      <div className="flex flex-col gap-3">
        {lugares.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no cargaste ningún lugar.</p>
        )}
        {lugares.map((lugar) => (
          <div
            key={lugar.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={
                    lugar.tipo === "PARTICULAR"
                      ? "rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground"
                      : "rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary"
                  }
                >
                  {lugar.tipo === "PARTICULAR" ? "Particular" : "Consultorio"}
                </span>
                <span className="text-sm font-medium">
                  {lugar.nombre ?? "Consulta particular"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {lugar.direccion}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {lugar.telefono}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openEdit(lugar)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Editar lugar"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(lugar)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Eliminar lugar"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Agregar lugar
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLugar ? "Editar lugar" : "Nuevo lugar"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Tipo *</Label>
              <RadioGroup
                value={tipo}
                onValueChange={(v) => setTipo(v as LugarTrabajoTipo)}
                className="flex flex-row flex-wrap items-center gap-x-6 gap-y-2"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="PARTICULAR"
                    id="lugar-particular"
                    disabled={particularDeshabilitado}
                  />
                  <Label
                    htmlFor="lugar-particular"
                    className="font-normal"
                    title={particularDeshabilitado ? "Ya tenés un lugar particular cargado." : undefined}
                  >
                    Particular
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="CONSULTORIO" id="lugar-consultorio" />
                  <Label htmlFor="lugar-consultorio" className="font-normal">
                    Consultorio
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {tipo === "CONSULTORIO" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lugar-nombre">Nombre del consultorio *</Label>
                <Input
                  id="lugar-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={triedSubmit && !nombre.trim() ? "border-destructive" : undefined}
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lugar-direccion">Dirección *</Label>
              <AddressAutocomplete
                id="lugar-direccion"
                value={direccion}
                onChangeText={handleDireccionTextChange}
                onSelect={handleDireccionSelect}
                className={triedSubmit && !direccion.trim() ? "border-destructive" : undefined}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lugar-telefono">Teléfono *</Label>
              <Input
                id="lugar-telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className={triedSubmit && !telefono.trim() ? "border-destructive" : undefined}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleGuardar} disabled={saving}>
              {saving ? "Guardando..." : editingLugar ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar lugar</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminará <strong>{deleteTarget?.nombre ?? "este lugar particular"}</strong> de tu
            práctica.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleEliminar} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
