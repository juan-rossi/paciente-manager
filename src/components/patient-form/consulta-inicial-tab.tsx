import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { esSaludMental, etiquetasHistoriaClinica, ETIQUETAS_PSICOLOGIA } from "./constants";
import { TextAreaField, TextField } from "./fields";
import { TranscribableTextAreaField } from "./transcribable-textarea-field";
import type { PatientFormValues } from "./types";
import type { GrupoEspecialidad } from "@/lib/especialidad";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
  invalidFields: Set<string>;
  transcripcionHabilitada?: boolean;
  resumirAntecedentesAlTerminar?: boolean;
  // Etiquetas según el grupo (ver etiquetasHistoriaClinica()). Psicología
  // además va sin autovalidez, con derivación, demanda y encuadre. Pediatría
  // va sin autovalidez (es una escala de adultos mayores). Psiquiatría, como
  // psicología, va con derivación y sin autovalidez.
  grupo?: GrupoEspecialidad;
};

export function ConsultaInicialTab({
  values,
  onChange,
  invalidFields,
  transcripcionHabilitada,
  resumirAntecedentesAlTerminar,
  grupo = "MEDICA",
}: Props) {
  const psicologia = grupo === "PSICOLOGIA";
  const saludMental = esSaludMental(grupo);
  const pediatria = grupo === "PEDIATRICA";
  // Salud mental y pediatría hablan de consumo, no de "hábitos tóxicos".
  const consumo = saludMental || pediatria;
  const etiquetas = etiquetasHistoriaClinica(grupo);

  const habitos: { field: "habitoAlcohol" | "habitoCigarrillos" | "habitoDrogas"; label: string }[] = [
    { field: "habitoAlcohol", label: "Alcohol" },
    { field: "habitoCigarrillos", label: consumo ? "Tabaco" : "Cigarrillos" },
    { field: "habitoDrogas", label: consumo ? "Otras sustancias" : "Drogas" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {saludMental ? (
        <div className="grid gap-6 md:grid-cols-2">
          <TextField
            label={ETIQUETAS_PSICOLOGIA.derivadoPor}
            value={values.derivadoPor}
            onChange={(v) => onChange("derivadoPor", v)}
            helpText="Profesional, institución o persona que lo derivó. Vacío si consultó por su cuenta."
          />
        </div>
      ) : pediatria ? null : (
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
        {saludMental && (
          <p className="text-xs text-muted-foreground">
            El detalle (frecuencia, cantidad, desde cuándo) va en Antecedentes → Consumo de sustancias.
          </p>
        )}
        {pediatria && (
          <p className="text-xs text-muted-foreground">
            Del propio paciente adolescente. El humo de tabaco en la casa va en Antecedentes.
          </p>
        )}
      </div>
    </div>
  );
}
