"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PacienteEliminadoRow = {
  id: string;
  nombreYApellido: string;
  nroDocumento: string | null;
  deletedAt: string;
};

export function EliminadosTable({ pacientes }: { pacientes: PacienteEliminadoRow[] }) {
  const router = useRouter();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRestaurar(id: string) {
    setRestoringId(id);
    setError(null);
    try {
      const response = await fetch(`/api/patients/${id}/restore`, { method: "POST" });
      if (!response.ok) {
        setError("No se pudo restaurar el paciente.");
        return;
      }
      router.refresh();
    } finally {
      setRestoringId(null);
    }
  }

  if (pacientes.length === 0) {
    return <p className="text-sm text-muted-foreground"><strong>No hay pacientes eliminados.</strong></p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre y Apellido</TableHead>
            <TableHead>DNI</TableHead>
            <TableHead>Eliminado el</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pacientes.map((paciente) => (
            <TableRow key={paciente.id}>
              <TableCell className="font-medium">{paciente.nombreYApellido}</TableCell>
              <TableCell>{paciente.nroDocumento ?? "—"}</TableCell>
              <TableCell>{new Date(paciente.deletedAt).toLocaleDateString("es-AR")}</TableCell>
              <TableCell className="text-right">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={restoringId === paciente.id}
                  onClick={() => handleRestaurar(paciente.id)}
                >
                  {restoringId === paciente.id ? "Restaurando..." : "Restaurar"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
