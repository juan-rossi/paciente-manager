"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsSection } from "@/components/settings-section";

type Secretaria = {
  id: string;
  email: string;
  nombre: string;
  createdAt: string;
};

type Props = {
  initialSecretarias: Secretaria[];
};

export function SecretaryUsers({ initialSecretarias }: Props) {
  const [secretarias, setSecretarias] = useState<Secretaria[]>(initialSecretarias);

  const [open, setOpen] = useState(false);
  const [editingSecretaria, setEditingSecretaria] = useState<Secretaria | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Secretaria | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function openCreate() {
    setEditingSecretaria(null);
    setEmail("");
    setPassword("");
    setNombre("");
    setError(null);
    setNotice(null);
    setOpen(true);
  }

  function openEdit(secretaria: Secretaria) {
    setEditingSecretaria(secretaria);
    setEmail(secretaria.email);
    setPassword("");
    setNombre(secretaria.nombre);
    setError(null);
    setNotice(null);
    setOpen(true);
  }

  async function handleGuardar() {
    // Nombre/contraseña solo son obligatorios acá al editar -- al crear, si
    // el email ya pertenece a una secretaria de otro médico, se ignoran (la
    // ruta la suma a esta cuenta tal cual está) y no hace falta llenarlos.
    if (!email.trim() || (editingSecretaria && !nombre.trim())) {
      setError("Completá el email.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(
        editingSecretaria ? `/api/users/${editingSecretaria.id}` : "/api/users",
        {
          method: editingSecretaria ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingSecretaria ? { email, nombre, password: password || undefined } : { email, password, nombre }
          ),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar la secretaria.");
        return;
      }
      setSecretarias((prev) =>
        editingSecretaria
          ? prev.map((s) => (s.id === data.secretaria.id ? data.secretaria : s))
          : [data.secretaria, ...prev]
      );
      setNotice(
        !editingSecretaria && data.linked
          ? `${data.secretaria.nombre} ya tenía una cuenta (asiste a otro médico) -- se sumó a la tuya.`
          : null
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
      await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
      setSecretarias((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SettingsSection
      title="Usuarios"
      description="Administrá las cuentas de secretario: pueden gestionar turnos, pero no acceden a la información clínica de los pacientes."
      icon={Users}
    >
      <div className="flex flex-col gap-3">
        {notice && (
          <p className="rounded-md border border-brand-accent/30 bg-brand-accent/10 p-3 text-sm text-brand-accent">
            {notice}
          </p>
        )}
        {secretarias.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay secretarios creados.</p>
        )}
        {secretarias.map((secretaria) => (
          <div
            key={secretaria.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{secretaria.nombre}</span>
              <span className="text-xs text-muted-foreground">{secretaria.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => openEdit(secretaria)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Editar secretaria"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(secretaria)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Eliminar secretario"
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
          Nuevo secretario
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSecretaria ? "Editar secretario" : "Nuevo secretario"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {!editingSecretaria && (
              <p className="text-xs text-muted-foreground">
                Si el email ya pertenece a un secretario que asiste a otro médico, se suma a tu
                cuenta tal cual está. (Nombre y contraseña no hacen falta en ese caso)
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Nombre</Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Contraseña
                {editingSecretaria && (
                  <span className="text-muted-foreground"> (dejar en blanco para no cambiarla)</span>
                )}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleGuardar} disabled={saving}>
              {saving ? "Guardando..." : editingSecretaria ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar secretaria</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminará el acceso de <strong>{deleteTarget?.nombre}</strong> ({deleteTarget?.email}
            ).
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleEliminar}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
