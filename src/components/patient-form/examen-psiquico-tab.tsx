import { Activity, Brain } from "lucide-react";
import { EXAMEN_PSIQUICO } from "./constants";
import { FormSection, TextAreaField, TextField } from "./fields";
import type { PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
};

// Psiquiatría (ver esPsiquiatrica()): examen psíquico en lugar del examen
// físico. El control clínico reusa las columnas de signos vitales (peso y
// presión importan para seguir antipsicóticos y estabilizadores).
export function ExamenPsiquicoTab({ values, onChange }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Examen psíquico" icon={Brain} contentClassName="sm:grid-cols-2 lg:grid-cols-2">
        {EXAMEN_PSIQUICO.map(({ campo, label, ayuda }) => (
          <TextAreaField
            key={campo}
            label={label}
            helpText={ayuda}
            rows={2}
            value={values[campo]}
            onChange={(v) => onChange(campo, v)}
          />
        ))}
      </FormSection>

      <FormSection title="Control clínico" icon={Activity}>
        <TextField label="Peso" value={values.pesoActual} onChange={(v) => onChange("pesoActual", v)} />
        <TextField label="Estatura" value={values.estatura} onChange={(v) => onChange("estatura", v)} />
        <TextField
          label="Presión arterial"
          value={values.presionArterial}
          onChange={(v) => onChange("presionArterial", v)}
        />
        <TextField
          label="Frecuencia cardíaca"
          value={values.frecuenciaCardiaca}
          onChange={(v) => onChange("frecuenciaCardiaca", v)}
        />
      </FormSection>
    </div>
  );
}
