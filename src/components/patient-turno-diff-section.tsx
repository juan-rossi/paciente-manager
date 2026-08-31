"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { FormSection } from "@/components/patient-form/fields";
import type { PatientFormValues } from "@/components/patient-form/types";
import type { TurnoDiff, TurnoDiffField } from "@/lib/patient-turno-diff";

type Props = {
  patientId: string;
  patientValues: PatientFormValues;
  diffs: TurnoDiff[];
};

export function PatientTurnoDiffSection({ patientId, patientValues, diffs }: Props) {
  const router = useRouter();
  const [resolvedFields, setResolvedFields] = useState<Set<TurnoDiffField>>(new Set());
  const [savingField, setSavingField] = useState<TurnoDiffField | null>(null);
  const [errorField, setErrorField] = useState<{ field: TurnoDiffField; message: string } | null>(
    null
  );

  const visibleDiffs = diffs.filter((d) => !resolvedFields.has(d.field));
  if (visibleDiffs.length === 0) return null;

  function ignorar(field: TurnoDiffField) {
    setResolvedFields((prev) => new Set(prev).add(field));
  }

  async function handleActualizar(diff: TurnoDiff) {
    setSavingField(diff.field);
    setErrorField(null);
    try {
      const values = { ...patientValues, [diff.field]: diff.newValue };
      const response = await fetch(`/api/patients/${patientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          estadoCivil: values.estadoCivil || null,
          evoluciones: [],
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setErrorField({ field: diff.field, message: data.error ?? "No se pudo actualizar." });
        return;
      }
      setResolvedFields((prev) => new Set(prev).add(diff.field));
      router.refresh();
    } finally {
      setSavingField(null);
    }
  }

  return (
    <FormSection
      title="Diferencias con el turno reservado"
      icon={TriangleAlert}
      headerClassName="bg-amber-100 dark:bg-amber-950/50"
      iconClassName="bg-amber-500/15 text-amber-700 dark:text-amber-400"
      contentClassName="bg-card"
    >
      <div className="col-span-full flex flex-col gap-2">
        {visibleDiffs.map((diff) => (
          <div key={diff.field} className="text-sm">
            <span className="font-medium">{diff.label}:</span> {diff.newValue}{" "}
            <span className="text-xs text-muted-foreground">
              (antes {diff.oldValue?.trim() || "—"})
            </span>{" "}
            ·{" "}
            <button
              type="button"
              onClick={() => handleActualizar(diff)}
              disabled={savingField === diff.field}
              className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              {savingField === diff.field ? "Actualizando..." : "Actualizar"}
            </button>{" | "}
            <button
              type="button"
              onClick={() => ignorar(diff.field)}
              className="text-xs text-muted-foreground hover:underline"
            >
              Ignorar
            </button>
            {errorField?.field === diff.field && (
              <span className="block text-xs text-destructive">{errorField.message}</span>
            )}
          </div>
        ))}
      </div>
    </FormSection>
  );
}
