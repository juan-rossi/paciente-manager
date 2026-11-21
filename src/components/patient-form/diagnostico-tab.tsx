import { ayudasDiagnostico, etiquetasHistoriaClinica, ETIQUETAS_PSICOLOGIA } from "./constants";
import { TextAreaField, TextField } from "./fields";
import type { PatientFormValues } from "./types";
import type { GrupoEspecialidad } from "@/lib/especialidad";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
  // Mismas columnas con otro nombre según el grupo (ver
  // etiquetasHistoriaClinica()); psicología suma el enfoque terapéutico.
  grupo?: GrupoEspecialidad;
};

export function DiagnosticoTab({ values, onChange, grupo = "MEDICA" }: Props) {
  const psicologia = grupo === "PSICOLOGIA";
  const etiquetas = etiquetasHistoriaClinica(grupo);

  if (psicologia) {
    return (
      <div className="flex flex-col gap-6">
        <TextAreaField
          label={etiquetas.diagnosticoPresuntivo}
          helpText="Hipótesis diagnóstica. Si usás DSM-5 o CIE-11, podés anotar el código."
          value={values.diagnosticoPresuntivo}
          onChange={(v) => onChange("diagnosticoPresuntivo", v)}
          rows={4}
        />
        <div className="grid gap-6 md:grid-cols-2">
          <TextField
            label={ETIQUETAS_PSICOLOGIA.enfoqueTerapeutico}
            helpText="Ej.: cognitivo-conductual, psicoanalítico, sistémico, integrativo."
            value={values.enfoqueTerapeutico}
            onChange={(v) => onChange("enfoqueTerapeutico", v)}
          />
        </div>
        <TextAreaField
          label={etiquetas.tratamiento}
          helpText="Qué se busca lograr con el tratamiento y cómo se va a trabajar."
          value={values.tratamiento}
          onChange={(v) => onChange("tratamiento", v)}
          rows={4}
        />
        <TextAreaField
          label={etiquetas.metodosComplementarios}
          helpText="Tests, escalas o técnicas proyectivas, con fecha y resultados."
          value={values.metodosComplementarios}
          onChange={(v) => onChange("metodosComplementarios", v)}
          rows={4}
        />
      </div>
    );
  }

  const ayudas = ayudasDiagnostico(grupo);
  return (
    <div className="flex flex-col gap-6">
      <TextAreaField
        label={etiquetas.diagnosticoPresuntivo}
        helpText={ayudas.diagnosticoPresuntivo}
        value={values.diagnosticoPresuntivo}
        onChange={(v) => onChange("diagnosticoPresuntivo", v)}
        rows={4}
      />
      <TextAreaField
        label={etiquetas.metodosComplementarios}
        helpText={ayudas.metodosComplementarios}
        value={values.metodosComplementarios}
        onChange={(v) => onChange("metodosComplementarios", v)}
        rows={4}
      />
      <TextAreaField
        label={etiquetas.tratamiento}
        helpText={ayudas.tratamiento}
        value={values.tratamiento}
        onChange={(v) => onChange("tratamiento", v)}
        rows={4}
      />
    </div>
  );
}
