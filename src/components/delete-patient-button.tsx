"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  patientId: string;
  patientName: string;
};

export function DeletePatientButton({ patientId, patientName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEliminar() {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
      if (!response.ok) {
        setError("No se pudo eliminar el paciente.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Eliminar
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar paciente</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará a <strong>{patientName}</strong> junto
            con todos sus antecedentes y evoluciones clínicas.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleEliminar} disabled={deleting}>
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
