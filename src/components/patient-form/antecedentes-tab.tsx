import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { GrupoEspecialidad } from "@/lib/especialidad";
import { antecedentesPara, ETIQUETAS_PSICOLOGIA } from "./constants";
import { DateInput } from "./date-input";
import { TextAreaField } from "./fields";
import type { AntecedenteValue, PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onAntecedenteChange: (tipo: AntecedenteValue["tipo"], patch: Partial<AntecedenteValue>) => void;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
  // Cada grupo tiene su checklist (ver antecedentesPara()). Psicología y
  // fonoaudiología usan detalle libre en vez de medicación, y psicología suma
  // la historia vital/familiar.
  grupo?: GrupoEspecialidad;
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

// Fonoaudiología: qué conviene anotar en el detalle de cada antecedente.
const DETALLE_FONOAUDIOLOGIA: Partial<Record<AntecedenteValue["tipo"], string>> = {
  ANTECEDENTES_PERINATALES: "Prematurez, peso al nacer, internación neonatal",
  RETRASO_LENGUAJE: "Edad de las primeras palabras y frases",
  OTITIS_REPETICION: "Cuántas por año y tratamiento (tubos, cirugía)",
  HIPOACUSIA: "Oído, grado y desde cuándo",
  AUDIFONOS_IMPLANTE_COCLEAR: "Cuál, en qué oído y desde cuándo",
  RESPIRACION_BUCAL: "Adenoidectomía, amigdalectomía u ortodoncia",
  HABITOS_ORALES: "Cuál y hasta qué edad",
  DIFICULTADES_DEGLUCION: "Con qué consistencias y desde cuándo",
  USO_PROFESIONAL_VOZ: "Profesión y horas de uso por día",
  NEUROLOGICAS: "Diagnóstico y quién lo sigue",
  DIFICULTADES_APRENDIZAJE: "Grado, área y si tiene apoyo escolar",
  TRATAMIENTO_FONOAUDIOLOGICO_PREVIO: "Con quién, motivo y duración",
  ENFERMEDADES_MEDICAS: "Enfermedad y tratamiento actual",
};

// Odontología: qué conviene anotar en "Medicación" (la droga importa: un
// anticoagulante o un bifosfonato cambian cómo se extrae o se opera).
const MEDICACION_ODONTOLOGIA: Partial<Record<AntecedenteValue["tipo"], string>> = {
  ALERGIA_ANESTESICOS: "Qué anestésico y qué reacción",
  ALERGIA_ANTIBIOTICOS: "Qué antibiótico y qué reacción",
  ALERGIA_LATEX: "Qué reacción",
  ALERGIA: "A qué y qué reacción",
  ANTICOAGULANTES: "Droga y dosis",
  BIFOSFONATOS: "Droga, vía y desde cuándo",
  TRASTORNOS_COAGULACION: "Cuál y tratamiento",
  ENDOCARDITIS_RIESGO: "Válvula, prótesis o antecedente",
  EMBARAZO: "Semanas de gestación",
  RADIOTERAPIA_CABEZA_CUELLO: "Zona y año",
};

function AntecedenteRow({
  tipo,
  label,
  antecedente,
  onChange,
  grupo,
}: {
  tipo: AntecedenteValue["tipo"];
  label: string;
  antecedente: AntecedenteValue;
  onChange: (patch: Partial<AntecedenteValue>) => void;
  grupo: GrupoEspecialidad;
}) {
  // Psicología y fonoaudiología anotan un detalle libre en vez de la
  // medicación.
  const detalles =
    grupo === "PSICOLOGIA" ? DETALLE_PSICOLOGIA : grupo === "FONOAUDIOLOGIA" ? DETALLE_FONOAUDIOLOGIA : null;
  // Las listas que no son la médica tienen etiquetas largas: van con ancho
  // flexible en vez de la columna fija de la lista médica.
  const etiquetaLarga = grupo !== "MEDICA";
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-3">
        <Label
          className={cn(
            "font-medium",
            etiquetaLarga ? "min-w-0 flex-1 leading-snug" : "w-32 shrink-0 whitespace-nowrap"
          )}
        >
          {label}
        </Label>
        <RadioGroup
          // w-auto: el RadioGroup base trae w-full y, con la etiqueta flexible
          // (todas menos la médica), la aplastaba hasta ancho 0.
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
        (detalles ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-[3fr_7fr]">
            <DateInput
              value={antecedente.fechaInicio}
              onChange={(fechaInicio) => onChange({ fechaInicio })}
            />
            <Input
              placeholder={detalles[tipo] ?? "Detalle"}
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
              placeholder={(grupo === "ODONTOLOGICA" && MEDICACION_ODONTOLOGIA[tipo]) || "Medicación"}
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

export function AntecedentesTab({ values, onAntecedenteChange, onChange, grupo = "MEDICA" }: Props) {
  const psicologia = grupo === "PSICOLOGIA";
  const byTipo = new Map(values.antecedentes.map((a) => [a.tipo, a]));
  const { columna1, columna2 } = antecedentesPara(grupo);

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
            grupo={grupo}
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
