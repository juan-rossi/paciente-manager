"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX } from "lucide-react";
import { SettingsSection } from "@/components/settings-section";
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
import { BAJA_CONFIRMACION, BAJA_DIAS_PARA_DESCARGAR } from "@/lib/baja-cuenta";

export function BajaCuentaSettings({ tieneSuscripcion }: { tieneSuscripcion: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmado = confirmacion.trim().toUpperCase() === BAJA_CONFIRMACION;

  async function darDeBaja() {
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch("/api/cuenta/baja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacion }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "No se pudo dar de baja la cuenta.");
        return;
      }
      router.push("/cuenta-baja");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SettingsSection title="Dar de baja mi cuenta" icon={UserX}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Tenés {BAJA_DIAS_PARA_DESCARGAR} días para descargar tus datos. Después los borramos.
        </p>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="self-start sm:self-center"
          onClick={() => {
            setConfirmacion("");
            setError(null);
            setAbierto(true);
          }}
        >
          Dar de baja
        </Button>
      </div>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de baja mi cuenta</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              {tieneSuscripcion && <li>Cancelamos tu suscripción: no se te vuelve a cobrar.</li>}
              <li>Tu perfil sale del directorio y se apaga la reserva de turnos online.</li>
              <li>Tu asistente deja de tener acceso.</li>
              <li>
                Durante {BAJA_DIAS_PARA_DESCARGAR} días solo vas a poder entrar para descargar tus datos o
                cancelar la baja. Después borramos todo.
              </li>
              <li>Las historias clínicas se deben conservar 10 años: descargalas antes.</li>
            </ul>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="baja-confirmacion">
                Escribí <strong className="font-semibold">{BAJA_CONFIRMACION}</strong> para confirmar
              </Label>
              <Input
                id="baja-confirmacion"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                autoComplete="off"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Volver
            </Button>
            <Button type="button" variant="destructive" disabled={!confirmado || enviando} onClick={darDeBaja}>
              {enviando ? "Dando de baja…" : "Dar de baja mi cuenta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
