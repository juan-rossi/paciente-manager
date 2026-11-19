"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
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
import { PASSWORD_MIN } from "@/lib/password-policy";

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

  // Cambio de email: se confirma con un link al email nuevo (ver
  // src/lib/cambio-email.ts); hasta entonces el email no cambia.
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailNuevo, setEmailNuevo] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailPendiente, setEmailPendiente] = useState<string | null>(null);

  function openEmailDialog() {
    setEmailNuevo("");
    setEmailPassword("");
    setEmailError(null);
    setEmailOpen(true);
  }

  async function handlePedirCambioEmail() {
    setEmailError(null);
    const destino = emailNuevo.trim().toLowerCase();
    if (!destino || !emailPassword) {
      setEmailError("Completá el email nuevo y tu contraseña actual.");
      return;
    }
    setEmailSaving(true);
    try {
      const response = await fetch("/api/cuenta/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNuevo: destino, password: emailPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setEmailError(data.error ?? "No se pudo pedir el cambio de email.");
        return;
      }
      setEmailOpen(false);
      setEmailPendiente(destino);
    } catch {
      setEmailError("No se pudo conectar con el servidor.");
    } finally {
      setEmailSaving(false);
    }
  }

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
    if (passwordNueva.length < PASSWORD_MIN) {
      setPasswordError(`La contraseña nueva debe tener al menos ${PASSWORD_MIN} caracteres.`);
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
      // El cambio cerró todas las sesiones, incluida esta (ver
      // /api/perfil/password): se ingresa de nuevo con la contraseña nueva.
      await signOut({ redirectTo: "/login?aviso=password-cambiada" });
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
          <div className="flex items-center gap-2">
            <Input id="perfil-email" value={email} disabled className="flex-1" />
            <Button type="button" variant="outline" size="sm" onClick={openEmailDialog}>
              Cambiar email
            </Button>
          </div>
          {emailPendiente && (
            <p className="text-xs text-muted-foreground">
              Si <strong className="font-medium text-foreground">{emailPendiente}</strong> no está en uso por otra
              cuenta, te mandamos ahí un link para confirmarlo. Tu email cambia recién cuando lo confirmes.
            </p>
          )}
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

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar email</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Te vamos a mandar un link al email nuevo para confirmarlo. Hasta que lo confirmes, seguís
              ingresando con el actual. Al confirmarlo se cierran todas tus sesiones.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email-nuevo">Email nuevo</Label>
              <Input
                id="email-nuevo"
                type="email"
                value={emailNuevo}
                onChange={(e) => setEmailNuevo(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email-password">Contraseña actual</Label>
              <PasswordInput
                id="email-password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {emailError && <p className="text-sm text-destructive">{emailError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" onClick={handlePedirCambioEmail} disabled={emailSaving}>
              {emailSaving ? "Enviando..." : "Enviar link de confirmación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                minLength={PASSWORD_MIN}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password-confirmar">Confirmar contraseña nueva</Label>
              <PasswordInput
                id="password-confirmar"
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                autoComplete="new-password"
                minLength={PASSWORD_MIN}
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
