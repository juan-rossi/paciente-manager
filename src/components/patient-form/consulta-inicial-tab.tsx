import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { etiquetasHistoriaClinica, ETIQUETAS_PSICOLOGIA } from "./constants";
import { TextAreaField, TextField } from "./fields";
import { TranscribableTextAreaField } from "./transcribable-textarea-field";
import type { PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
  invalidFields: Set<string>;
  transcripcionHabilitada?: boolean;
  resumirAntecedentesAlTerminar?: boolean;
  // Historia clínica de psicología (ver esPsicologia()): sin autovalidez,
  // con derivación, demanda y encuadre.
  psicologia?: boolean;
};

export function ConsultaInicialTab({
  values,
  onChange,
  invalidFields,
  transcripcionHabilitada,
  resumirAntecedentesAlTerminar,
  psicologia = false,
}: Props) {
  const etiquetas = etiquetasHistoriaClinica(psicologia);

  const habitos: { field: "habitoAlcohol" | "habitoCigarrillos" | "habitoDrogas"; label: string }[] = [
    { field: "habitoAlcohol", label: "Alcohol" },
    { field: "habitoCigarrillos", label: psicologia ? "Tabaco" : "Cigarrillos" },
    { field: "habitoDrogas", label: psicologia ? "Otras sustancias" : "Drogas" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {psicologia ? (
        <div className="grid gap-6 md:grid-cols-2">
          <TextField
            label={ETIQUETAS_PSICOLOGIA.derivadoPor}
            value={values.derivadoPor}
            onChange={(v) => onChange("derivadoPor", v)}
            helpText="Profesional, institución o persona que lo derivó. Vacío si consultó por su cuenta."
          />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          <TextField
            label="AUTOVALIDO Total"
            value={values.autoValidoTotal}
            onChange={(v) => onChange("autoValidoTotal", v)}
          />
          <TextField
            label="Parcial"
            value={values.autoValidoParcial}
            onChange={(v) => onChange("autoValidoParcial", v)}
          />
          <TextField
            label="Dependiente"
            value={values.dependiente}
            onChange={(v) => onChange("dependiente", v)}
          />
        </div>
      )}

      <TextAreaField
        label={etiquetas.motivoConsulta}
        value={values.motivoConsulta}
        onChange={(v) => onChange("motivoConsulta", v)}
        rows={3}
        required
        invalid={invalidFields.has("motivoConsulta")}
      />

      <TranscribableTextAreaField
        label={etiquetas.antecedentesEnfermedad}
        helpText={etiquetas.antecedentesEnfermedadAyuda}
        value={values.antecedentesEnfermedad}
        onChange={(v) => onChange("antecedentesEnfermedad", v)}
        rows={5}
        tipoResumen="antecedentes"
        dictado={values.antecedentesEnfermedadDictado}
        onDictadoChange={(v) => onChange("antecedentesEnfermedadDictado", v)}
        transcripcionHabilitada={transcripcionHabilitada}
        resumirAlTerminar={resumirAntecedentesAlTerminar}
      />

      {psicologia && (
        <>
          <TextAreaField
            label={ETIQUETAS_PSICOLOGIA.expectativasTratamiento}
            helpText="Quién pide la consulta, qué demanda y qué espera del tratamiento."
            value={values.expectativasTratamiento}
            onChange={(v) => onChange("expectativasTratamiento", v)}
            rows={3}
          />
          <TextAreaField
            label={ETIQUETAS_PSICOLOGIA.encuadre}
            helpText="Frecuencia, modalidad (presencial u online), duración de las sesiones y honorarios."
            value={values.encuadre}
            onChange={(v) => onChange("encuadre", v)}
            rows={2}
          />
        </>
      )}

      <div className="flex flex-col gap-2">
        <Label>{etiquetas.habitos}</Label>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {habitos.map(({ field, label }) => (
            <div key={field} className="flex items-center gap-2">
              <Checkbox
                id={`habito-${field}`}
                checked={values[field]}
                onCheckedChange={(checked) => onChange(field, checked === true)}
              />
              <Label htmlFor={`habito-${field}`} className="font-normal">
                {label}
              </Label>
            </div>
          ))}
        </div>
        {psicologia && (
          <p className="text-xs text-muted-foreground">
            El detalle (frecuencia, cantidad, desde cuándo) va en Antecedentes → Consumo de sustancias.
          </p>
        )}
      </div>
    </div>
  );
}
