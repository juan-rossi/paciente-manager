"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  email: string;
};

export function SeguridadSettings({ email }: Props) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirmar, setPasswordConfirmar] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function openPasswordDialog() {
    setPasswordActual("");
    setPasswordNueva("");
    setPasswordConfirmar("");
    setPasswordError(null);
    setPasswordOpen(true);
  }

  async function handleGuardarPassword() {
    setPasswordError(null);
    if (!passwordActual) {
      setPasswordError("Ingresá tu contraseña actual.");
      return;
    }
    if (passwordNueva.length < 6) {
      setPasswordError("La contraseña nueva debe tener al menos 6 caracteres.");
      return;
    }
    if (passwordNueva !== passwordConfirmar) {
      setPasswordError("Las contraseñas nuevas no coinciden.");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch("/api/perfil/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual, passwordNueva }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPasswordError(data.error ?? "No se pudo cambiar la contraseña.");
        return;
      }
      setPasswordOpen(false);
    } catch {
      setPasswordError("No se pudo conectar con el servidor.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <SettingsSection title="Seguridad" icon={Lock}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="perfil-email">Email</Label>
          <Input id="perfil-email" value={email} disabled />
        </div>
        <div className="flex items-center justify-between border-t border-dashed border-border pt-3">
          <div className="flex flex-col">
            <span className="text-sm font-medium">Contraseña</span>
            <span className="text-xs text-muted-foreground">••••••••••</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={openPasswordDialog}>
            Cambiar contraseña
          </Button>
        </div>
      </SettingsSection>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password-actual">Contraseña actual</Label>
              <PasswordInput
                id="password-actual"
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password-nueva">Contraseña nueva</Label>
              <PasswordInput
                id="password-nueva"
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password-confirmar">Confirmar contraseña nueva</Label>
              <PasswordInput
                id="password-confirmar"
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleGuardarPassword} disabled={passwordSaving}>
              {passwordSaving ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
