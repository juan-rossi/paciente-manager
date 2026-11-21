"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/patient-form/date-input";
import { FotosEvolucionEditor, MiniaturasEvolucion } from "@/components/fotos/fotos-evolucion";
import { subirFotosPendientes, type FotoPendiente } from "@/components/fotos/foto-utils";
import { formatDateParamBA } from "@/lib/timezone";
import type { FotoValue } from "@/lib/foto-clinica";

type Props = {
  // Sin paciente guardado no se puede subir (la foto va al servidor).
  patientId: string | undefined;
  // Las fotos de todas las consultas (para comparar con las de seguimiento).
  fotos: FotoValue[];
  // En el examen se suben; en la ficha solo se ven, comparan y eliminan.
  editable: boolean;
};

// Fotos de la consulta inicial (dermatología): las que no pertenecen a una
// evolución. Son el punto de partida contra el que se comparan las de cada
// control. Se suben apenas se confirman (no esperan al "Guardar" del
// formulario).
export function FotosConsultaInicial({ patientId, fotos, editable }: Props) {
  const router = useRouter();
  const [todas, setTodas] = useState<FotoValue[]>(fotos);
  const [previas, setPrevias] = useState(fotos);
  if (fotos !== previas) {
    setPrevias(fotos);
    setTodas(fotos);
  }
  const iniciales = todas.filter((f) => f.evolucionId === null);

  const [pendientes, setPendientes] = useState<FotoPendiente[]>([]);
  const [fecha, setFecha] = useState(formatDateParamBA(new Date()));
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir() {
    if (!patientId || pendientes.length === 0) return;
    if (pendientes.some((p) => !p.zona.trim())) {
      setError("Indicá la zona del cuerpo de cada foto.");
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const { subidas, fallidas, motivo } = await subirFotosPendientes(patientId, { fecha }, pendientes);
      for (const p of pendientes) if (!fallidas.includes(p)) URL.revokeObjectURL(p.previa);
      setPendientes(fallidas);
      if (subidas.length > 0) {
        setTodas((prev) => [...prev, ...subidas]);
        // Las evoluciones también las usan para comparar.
        router.refresh();
      }
      if (fallidas.length > 0) {
        setError(`No se pudo subir ${fallidas.length === 1 ? "una foto" : `${fallidas.length} fotos`}: ${motivo}`);
      }
    } finally {
      setSubiendo(false);
    }
  }

  if (!editable && iniciales.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {iniciales.length > 0 ? (
        <MiniaturasEvolucion
          patientId={patientId ?? ""}
          fotos={iniciales}
          todas={todas}
          onEliminada={(id) => {
            setTodas((prev) => prev.filter((f) => f.id !== id));
            router.refresh();
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Todavía no hay fotos de la consulta inicial. Son el punto de partida para comparar en cada control.
        </p>
      )}

      {editable && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <FotosEvolucionEditor
            patientId={patientId}
            existentes={[]}
            pendientes={pendientes}
            onChangePendientes={setPendientes}
            zonasConocidas={[...new Set(todas.map((f) => f.zona))]}
          />
          {pendientes.length > 0 && (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Fecha de la consulta</Label>
                <div className="w-44">
                  <DateInput value={fecha} onChange={setFecha} />
                </div>
              </div>
              <Button type="button" onClick={subir} disabled={subiendo}>
                <Upload className="size-4" />
                {subiendo
                  ? "Subiendo..."
                  : `Subir ${pendientes.length === 1 ? "la foto" : `las ${pendientes.length} fotos`}`}
              </Button>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
