"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// "Carga terminada": borra los archivos en el momento y le avisa al médico
// por mail para que revise y confirme (ver /api/admin/importaciones/[id]/cargada).
export function ImportacionCargadaForm({ importacionId, medico }: { importacionId: string; medico: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [notaEquipo, setNotaEquipo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function marcar() {
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/importaciones/${importacionId}/cargada`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notaEquipo: notaEquipo.trim() || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "No se pudo marcar la carga.");
        return;
      }
      setAbierto(false);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setAbierto(true)}>
        <CheckCircle2 className="size-4" />
        Carga terminada
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carga terminada</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Se borran los archivos ahora y le avisamos por mail a {medico} para que revise y confirme. Hacelo
              recién cuando ya esté todo cargado en su cuenta.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nota-equipo">Mensaje para el médico (opcional)</Label>
              <Textarea
                id="nota-equipo"
                value={notaEquipo}
                onChange={(e) => setNotaEquipo(e.target.value)}
                placeholder="Ej.: Cargamos 847 pacientes con sus evoluciones desde 2019."
                maxLength={2000}
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Volver
            </Button>
            <Button type="button" disabled={enviando} onClick={marcar}>
              {enviando ? "Guardando…" : "Borrar archivos y avisar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// "Archivos no válidos": el equipo no puede cargar lo que mandó el médico.
// Borra los archivos y le manda el motivo por mail (y lo ve en Mis datos)
// para que envíe otros (ver /api/admin/importaciones/[id]/rechazar).
export function ImportacionRechazarForm({ importacionId, medico }: { importacionId: string; medico: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rechazar() {
    setEnviando(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/importaciones/${importacionId}/rechazar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: motivo.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "No se pudo rechazar la importación.");
        return;
      }
      setAbierto(false);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setAbierto(true)}>
        <XCircle className="size-4" />
        Archivos no válidos
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archivos no válidos</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Se borran los archivos ahora y le avisamos por mail a {medico} con este mensaje, para que nos mande
              otros. También lo ve en Configuración &gt; Mis datos.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="motivo-rechazo">Qué pasó y qué necesitamos</Label>
              <Textarea
                id="motivo-rechazo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej.: El PDF es un escaneo sin texto y no se puede leer. Si tu sistema anterior exporta a Excel o CSV, mandanos ese archivo."
                maxLength={2000}
                rows={4}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Volver
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={enviando || motivo.trim().length < 10}
              onClick={rechazar}
            >
              {enviando ? "Guardando…" : "Borrar archivos y avisar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
