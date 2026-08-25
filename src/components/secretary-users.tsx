"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Secretaria | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEmail("");
    setPassword("");
    setNombre("");
    setError(null);
    setOpen(true);
  }

  async function handleCrear() {
    if (!email.trim() || !password.trim() || !nombre.trim()) {
      setError("Completá todos los campos.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nombre }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo crear la secretaria.");
        return;
      }
      setSecretarias((prev) => [data.secretaria, ...prev]);
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {secretarias.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay secretarias creadas.</p>
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
            <button
              type="button"
              onClick={() => setDeleteTarget(secretaria)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Eliminar secretaria"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div>
        <Button type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Nueva secretaria
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva secretaria</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleCrear} disabled={saving}>
              {saving ? "Creando..." : "Crear"}
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
    </div>
  );
}
