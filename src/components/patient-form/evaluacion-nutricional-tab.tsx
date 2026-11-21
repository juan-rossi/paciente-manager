import { Apple, Ruler } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { imcLegible } from "@/lib/nutricion";
import { ETIQUETAS_NUTRICION } from "./constants";
import { FormSection, TextAreaField, TextField } from "./fields";
import { esMenorDeEdad } from "./utils";
import type { PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
};

// Nutrición (ver esNutricion()): evaluación nutricional en lugar del examen
// físico. Peso, peso habitual y estatura son las columnas de signos vitales;
// el IMC se calcula (en menores no se clasifica: va por percentiles).
export function EvaluacionNutricionalTab({ values, onChange }: Props) {
  const campo = (field: keyof PatientFormValues & string, label: string, helpText?: string) => (
    <TextField
      label={label}
      helpText={helpText}
      value={values[field] as string}
      onChange={(v) => onChange(field, v as never)}
    />
  );
  const imc = imcLegible(values.pesoActual, values.estatura, esMenorDeEdad(values.fechaNacimiento));

  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Antropometría" icon={Ruler}>
        {campo("pesoActual", "Peso actual", "En kg")}
        {campo("estatura", "Estatura", "En metros o centímetros")}
        <div className="flex flex-col gap-1.5">
          <Label>IMC</Label>
          {/* Solo lectura, como la Edad en Datos personales. */}
          <Input value={imc} placeholder="—" readOnly disabled />
          <p className="text-xs text-muted-foreground">Se calcula con el peso y la estatura</p>
        </div>
        {campo("pesoHabitual", "Peso habitual", "En kg")}
        {campo("circunferenciaCintura", ETIQUETAS_NUTRICION.circunferenciaCintura, "En cm")}
        {campo("circunferenciaCadera", ETIQUETAS_NUTRICION.circunferenciaCadera, "En cm")}
        {campo("porcentajeGrasa", ETIQUETAS_NUTRICION.porcentajeGrasa, "Por bioimpedancia o pliegues")}
        {campo("pesoObjetivo", ETIQUETAS_NUTRICION.pesoObjetivo, "En kg")}
      </FormSection>

      <FormSection title="Anamnesis alimentaria" icon={Apple} contentClassName="lg:grid-cols-1 sm:grid-cols-1">
        <TextAreaField
          label={ETIQUETAS_NUTRICION.habitosAlimentarios}
          helpText="Comidas por día, horarios, picoteo, dónde y con quién come, líquidos, apetito, preferencias y aversiones."
          rows={4}
          value={values.habitosAlimentarios}
          onChange={(v) => onChange("habitosAlimentarios", v)}
        />
        <TextAreaField
          label={ETIQUETAS_NUTRICION.recordatorio24h}
          helpText="Qué comió y tomó ayer, de la mañana a la noche, con cantidades aproximadas."
          rows={5}
          value={values.recordatorio24h}
          onChange={(v) => onChange("recordatorio24h", v)}
        />
        <TextField
          label={ETIQUETAS_NUTRICION.actividadFisica}
          helpText="Tipo, frecuencia y duración"
          value={values.actividadFisica}
          onChange={(v) => onChange("actividadFisica", v)}
        />
      </FormSection>
    </div>
  );
}
