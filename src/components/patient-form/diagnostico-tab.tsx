import { TextAreaField } from "./fields";
import type { PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
};

export function DiagnosticoTab({ values, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <TextAreaField
        label="Diagnóstico Presuntivo"
        value={values.diagnosticoPresuntivo}
        onChange={(v) => onChange("diagnosticoPresuntivo", v)}
        rows={4}
      />
      <TextAreaField
        label="Métodos Complementarios (Laboratorio, RX, Eco, etc.)"
        value={values.metodosComplementarios}
        onChange={(v) => onChange("metodosComplementarios", v)}
        rows={4}
      />
      <TextAreaField
        label="Tratamiento (drogas, dósis, nro. de tomas, tiempo de duración)"
        value={values.tratamiento}
        onChange={(v) => onChange("tratamiento", v)}
        rows={4}
      />
    </div>
  );
}
