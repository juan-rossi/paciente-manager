import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { antecedentesPara, ETIQUETAS_PSICOLOGIA } from "./constants";
import { DateInput } from "./date-input";
import { TextAreaField } from "./fields";
import type { AntecedenteValue, PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onAntecedenteChange: (tipo: AntecedenteValue["tipo"], patch: Partial<AntecedenteValue>) => void;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
  // Historia clínica de psicología (ver esPsicologia()): otro checklist, con
  // detalle libre en vez de medicación, y la historia vital/familiar.
  psicologia?: boolean;
};

// Qué conviene anotar en el detalle de cada antecedente de psicología.
const DETALLE_PSICOLOGIA: Partial<Record<AntecedenteValue["tipo"], string>> = {
  TRATAMIENTO_PSICOLOGICO_PREVIO: "Con quién, cuánto duró y por qué terminó",
  TRATAMIENTO_PSIQUIATRICO_PREVIO: "Profesional, motivo y duración",
  MEDICACION_PSIQUIATRICA: "Droga, dosis y quién la indica",
  INTERNACIONES_PSIQUIATRICAS: "Dónde, motivo y duración",
  CONSUMO_SUSTANCIAS: "Sustancia, frecuencia y cantidad",
  ENFERMEDADES_MEDICAS: "Enfermedad y tratamiento actual",
  AUTOLESIONES: "Tipo, frecuencia y última vez",
  INTENTOS_SUICIDIO: "Cuántos, método y último episodio",
  SALUD_MENTAL_FAMILIAR: "Familiar y diagnóstico o problemática",
  SITUACIONES_TRAUMATICAS: "Qué pasó y a qué edad",
};

function AntecedenteRow({
  tipo,
  label,
  antecedente,
  onChange,
  psicologia,
}: {
  tipo: AntecedenteValue["tipo"];
  label: string;
  antecedente: AntecedenteValue;
  onChange: (patch: Partial<AntecedenteValue>) => void;
  psicologia: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-3">
        <Label
          className={cn(
            "font-medium",
            psicologia ? "min-w-0 flex-1 leading-snug" : "w-32 shrink-0 whitespace-nowrap"
          )}
        >
          {label}
        </Label>
        <RadioGroup
          // w-auto: el RadioGroup base trae w-full y, con la etiqueta flexible
          // (psicología), la aplastaba hasta ancho 0.
          className="flex w-auto shrink-0 gap-4"
          value={antecedente.respuesta ? "SI" : "NO"}
          onValueChange={(v) => onChange({ respuesta: v === "SI" })}
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="SI" id={`${tipo}-si`} />
            <Label htmlFor={`${tipo}-si`} className="font-normal">
              SI
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="NO" id={`${tipo}-no`} />
            <Label htmlFor={`${tipo}-no`} className="font-normal">
              NO
            </Label>
          </div>
        </RadioGroup>
      </div>

      {antecedente.respuesta &&
        (psicologia ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-[3fr_7fr]">
            <DateInput
              value={antecedente.fechaInicio}
              onChange={(fechaInicio) => onChange({ fechaInicio })}
            />
            <Input
              placeholder={DETALLE_PSICOLOGIA[tipo] ?? "Detalle"}
              value={antecedente.descripcion}
              onChange={(e) => onChange({ descripcion: e.target.value })}
            />
            <Input
              placeholder="Estado actual"
              className="sm:col-span-2"
              value={antecedente.resolucion}
              onChange={(e) => onChange({ resolucion: e.target.value })}
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-2 sm:grid-cols-[3fr_7fr]">
            <DateInput
              value={antecedente.fechaInicio}
              onChange={(fechaInicio) => onChange({ fechaInicio })}
            />
            <Input
              placeholder="Medicación"
              value={antecedente.medicacion}
              onChange={(e) => onChange({ medicacion: e.target.value })}
            />
            <Input
              placeholder="Resolución"
              className="sm:col-span-2"
              value={antecedente.resolucion}
              onChange={(e) => onChange({ resolucion: e.target.value })}
            />
          </div>
        ))}
    </div>
  );
}

export function AntecedentesTab({ values, onAntecedenteChange, onChange, psicologia = false }: Props) {
  const byTipo = new Map(values.antecedentes.map((a) => [a.tipo, a]));
  const { columna1, columna2 } = antecedentesPara(psicologia);

  const columna = (items: readonly { tipo: AntecedenteValue["tipo"]; label: string }[]) => (
    <div className="flex flex-col gap-3">
      {items.map(({ tipo, label }) => {
        const antecedente = byTipo.get(tipo);
        if (!antecedente) return null;
        return (
          <AntecedenteRow
            key={tipo}
            tipo={tipo}
            label={label}
            antecedente={antecedente}
            onChange={(patch) => onAntecedenteChange(tipo, patch)}
            psicologia={psicologia}
          />
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 md:grid-cols-2">
        {columna(columna1)}
        {columna(columna2)}
      </div>

      {psicologia && (
        <div className="flex flex-col gap-6 border-t pt-6">
          <TextAreaField
            label={ETIQUETAS_PSICOLOGIA.grupoFamiliar}
            helpText="Con quién vive, composición familiar y cómo son los vínculos."
            value={values.grupoFamiliar}
            onChange={(v) => onChange("grupoFamiliar", v)}
            rows={4}
          />
          <TextAreaField
            label={ETIQUETAS_PSICOLOGIA.historiaVital}
            helpText="Infancia, escolaridad, trabajo, pareja, vínculos significativos y hechos relevantes de su historia."
            value={values.historiaVital}
            onChange={(v) => onChange("historiaVital", v)}
            rows={6}
          />
        </div>
      )}
    </div>
  );
}
