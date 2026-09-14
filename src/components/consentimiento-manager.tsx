"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ClipboardSignature,
  FileSignature,
  MessageCircle,
  Plus,
  Printer,
  Trash2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateInput } from "@/components/patient-form/date-input";
import { formatFechaCorta } from "@/components/patient-form/utils";

export type ConsentimientoValue = {
  id: string;
  procedimiento: string;
  riesgosBeneficios: string;
  alternativas: string | null;
  tipo: "VERBAL" | "ESCRITO";
  estado: "OTORGADO" | "RECHAZADO";
  fecha: string;
  revocadoEn: string | null;
  revocadoMotivo: string | null;
  deletedAt: string | null;
};

type Props = {
  patientId: string;
  initialConsentimientos: ConsentimientoValue[];
};

// `new Date().toISOString()` da la fecha en UTC: cerca de medianoche, en un huso
// horario negativo (ej. Argentina), ya cayó en el día siguiente en UTC. Hay que
// armar la fecha "de hoy" con los componentes LOCALES, no los de UTC.
function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ConsentimientoManager({ patientId, initialConsentimientos }: Props) {
  const [items, setItems] = useState<ConsentimientoValue[]>(initialConsentimientos);
  const activos = items.filter((c) => !c.deletedAt);
  const eliminados = items.filter((c) => c.deletedAt);

  const [open, setOpen] = useState(false);
  const [procedimiento, setProcedimiento] = useState("");
  const [riesgosBeneficios, setRiesgosBeneficios] = useState("");
  const [alternativas, setAlternativas] = useState("");
  const [tipo, setTipo] = useState<"VERBAL" | "ESCRITO">("VERBAL");
  const [estado, setEstado] = useState<"OTORGADO" | "RECHAZADO">("OTORGADO");
  const [fecha, setFecha] = useState(todayLocal());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [revocarId, setRevocarId] = useState<string | null>(null);
  const [motivoRevocacion, setMotivoRevocacion] = useState("");
  const [revocando, setRevocando] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  function resetForm() {
    setProcedimiento("");
    setRiesgosBeneficios("");
    setAlternativas("");
    setTipo("VERBAL");
    setEstado("OTORGADO");
    setFecha(todayLocal());
    setError(null);
  }

  async function handleGuardar() {
    if (!procedimiento.trim() || !riesgosBeneficios.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${patientId}/consentimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedimiento,
          riesgosBeneficios,
          alternativas,
          tipo,
          estado,
          fecha,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el consentimiento.");
        return;
      }
      setItems((prev) => [data.consentimiento, ...prev]);
      setOpen(false);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleRevocar() {
    if (!revocarId) return;
    setRevocando(true);
    try {
      const response = await fetch(
        `/api/patients/${patientId}/consentimientos/${revocarId}/revocar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo: motivoRevocacion }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setItems((prev) => prev.map((c) => (c.id === revocarId ? data.consentimiento : c)));
        setRevocarId(null);
        setMotivoRevocacion("");
      }
    } finally {
      setRevocando(false);
    }
  }

  async function handleEliminar() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/patients/${patientId}/consentimientos/${deleteId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.ok) {
        setItems((prev) => prev.map((c) => (c.id === deleteId ? data.consentimiento : c)));
        setDeleteId(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleRestaurar(id: string) {
    setRestoringId(id);
    try {
      const response = await fetch(
        `/api/patients/${patientId}/consentimientos/${id}/restore`,
        { method: "POST" }
      );
      const data = await response.json();
      if (response.ok) {
        setItems((prev) => prev.map((c) => (c.id === id ? data.consentimiento : c)));
      }
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {activos.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavía no hay consentimientos informados registrados.
          </p>
        )}
        {activos.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold">{formatFechaCorta(c.fecha)}</span>
                  <Badge variant={c.tipo === "ESCRITO" ? "default" : "outline"}>
                    {c.tipo === "ESCRITO" ? (
                      <FileSignature className="size-3" />
                    ) : (
                      <MessageCircle className="size-3" />
                    )}
                    {c.tipo === "ESCRITO" ? "Escrito" : "Verbal"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      c.estado === "OTORGADO"
                        ? "border-brand-accent/20 bg-brand-accent/10 text-brand-accent"
                        : "border-destructive/20 bg-destructive/10 text-destructive"
                    }
                  >
                    {c.estado === "OTORGADO" ? "Otorgado" : "Rechazado"}
                  </Badge>
                  {c.revocadoEn && (
                    <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
                      Revocado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    title="Imprimir"
                    aria-label="Imprimir"
                    nativeButton={false}
                    render={
                      <Link
                        href={`/patients/${patientId}/consentimientos/${c.id}/imprimir`}
                        target="_blank"
                      />
                    }
                  >
                    <Printer className="size-3.5" />
                  </Button>
                  {!c.revocadoEn && c.estado === "OTORGADO" && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      title="Revocar"
                      aria-label="Revocar"
                      onClick={() => setRevocarId(c.id)}
                    >
                      <Undo2 className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    title="Eliminar"
                    aria-label="Eliminar"
                    onClick={() => setDeleteId(c.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <p className="text-sm font-semibold">{c.procedimiento}</p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {c.riesgosBeneficios}
              </p>
              {c.alternativas && (
                <p className="text-xs text-muted-foreground">
                  <strong>Alternativas:</strong> {c.alternativas}
                </p>
              )}
              {c.revocadoEn && (
                <p className="text-xs text-destructive">
                  Revocado el {formatFechaCorta(c.revocadoEn.slice(0, 10))}
                  {c.revocadoMotivo ? ` — ${c.revocadoMotivo}` : ""}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {eliminados.length > 0 && (
        <details className="group overflow-hidden rounded-xl border border-border/60">
          <summary className="flex cursor-pointer select-none items-center justify-between gap-2 bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground sm:px-5 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Trash2 className="size-3.5" />
              </span>
              Consentimientos eliminados ({eliminados.length})
            </span>
          </summary>
          <div className="flex flex-col gap-3 border-t border-border/60 p-3">
            {eliminados.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-muted-foreground line-through">
                      {formatFechaCorta(c.fecha)} — {c.procedimiento}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={restoringId === c.id}
                      onClick={() => handleRestaurar(c.id)}
                    >
                      {restoringId === c.id ? "Restaurando..." : "Restaurar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      <div className="flex justify-end">
        <Dialog
          open={open}
          onOpenChange={(next) => {
            if (!next) resetForm();
            setOpen(next);
          }}
        >
          <Button type="button" onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Nuevo consentimiento
          </Button>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo consentimiento informado</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Procedimiento / tratamiento</Label>
                <Input
                  value={procedimiento}
                  onChange={(e) => setProcedimiento(e.target.value)}
                  placeholder="Ej. Biopsia de piel"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Riesgos, beneficios y consecuencias informadas</Label>
                <Textarea
                  rows={4}
                  value={riesgosBeneficios}
                  onChange={(e) => setRiesgosBeneficios(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Alternativas informadas (opcional)</Label>
                <Textarea
                  rows={2}
                  value={alternativas}
                  onChange={(e) => setAlternativas(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Fecha</Label>
                  <DateInput value={fecha} onChange={setFecha} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Tipo</Label>
                  <RadioGroup
                    className="flex gap-4 pt-1.5"
                    value={tipo}
                    onValueChange={(v) => setTipo(v as "VERBAL" | "ESCRITO")}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="VERBAL" id="tipo-verbal" />
                      <Label htmlFor="tipo-verbal" className="font-normal">
                        Verbal
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="ESCRITO" id="tipo-escrito" />
                      <Label htmlFor="tipo-escrito" className="font-normal">
                        Escrito
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Estado</Label>
                <RadioGroup
                  className="flex gap-4"
                  value={estado}
                  onValueChange={(v) => setEstado(v as "OTORGADO" | "RECHAZADO")}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="OTORGADO" id="estado-otorgado" />
                    <Label htmlFor="estado-otorgado" className="font-normal">
                      Otorgado
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="RECHAZADO" id="estado-rechazado" />
                    <Label htmlFor="estado-rechazado" className="font-normal">
                      Rechazado
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              {tipo === "ESCRITO" && (
                <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                  <ClipboardSignature className="mr-1 inline size-3.5" />
                  Los consentimientos escritos requieren firma en papel (Ley 26.529, art. 7-8) —
                  imprimí el documento desde la ficha una vez guardado y archivá el original
                  firmado.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handleGuardar}
                disabled={saving || !procedimiento.trim() || !riesgosBeneficios.trim()}
              >
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={revocarId !== null}
        onOpenChange={(next) => {
          if (!next) {
            setRevocarId(null);
            setMotivoRevocacion("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revocar consentimiento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El paciente puede revocar su consentimiento en cualquier momento (Ley 26.529, art.
            10). Queda constancia de la fecha y el motivo, sin borrar el consentimiento original.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label>Motivo (opcional)</Label>
            <Textarea
              rows={2}
              value={motivoRevocacion}
              onChange={(e) => setMotivoRevocacion(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevocarId(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleRevocar} disabled={revocando}>
              {revocando ? "Revocando..." : "Revocar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={(next) => !next && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar consentimiento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Este consentimiento dejará de aparecer en la lista activa. Por la Ley 26.529, el
            registro no se destruye: se conserva de forma segura y se puede restaurar.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleEliminar} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
