import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { GrupoEspecialidad } from "@/lib/especialidad";
import { Venus } from "lucide-react";
import { edadGestacional, formatEdadGestacional, formulaObstetrica } from "@/lib/obstetricia";
import { formatFechaCorta } from "./utils";
import {
  antecedenteAplicaAlSexo,
  antecedentesPara,
  esSaludMental,
  ETIQUETAS_GINECOLOGIA,
  ETIQUETAS_PSICOLOGIA,
} from "./constants";
import { DateInput } from "./date-input";
import { FormSection, TextAreaField, TextField } from "./fields";
import type { AntecedenteValue, PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onAntecedenteChange: (tipo: AntecedenteValue["tipo"], patch: Partial<AntecedenteValue>) => void;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
  // Cada grupo tiene su checklist (ver antecedentesPara()). Psicología,
  // fonoaudiología y pediatría usan detalle libre en vez de medicación, y
  // psicología suma la historia vital/familiar.
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

// Pediatría: qué conviene anotar en el detalle de cada antecedente.
const DETALLE_PEDIATRIA: Partial<Record<AntecedenteValue["tipo"], string>> = {
  ANTECEDENTES_PERINATALES: "Edad gestacional, peso al nacer, tipo de parto, internación neonatal",
  VACUNACION_INCOMPLETA: "Qué vacunas faltan o están atrasadas",
  RETRASO_DESARROLLO: "Área (motora, lenguaje, social) y quién lo sigue",
  ALERGIA: "A qué (alimentos, medicamentos) y qué reacción",
  ASMA: "Frecuencia de las crisis y medicación",
  OTITIS_REPETICION: "Cuántas por año y tratamiento (tubos, cirugía)",
  CONVULSIONES: "Tipo, a qué edad y si toma medicación",
  CARDIOPATIAS: "Congénita o adquirida, cirugía y quién la sigue",
  ENFERMEDADES_MEDICAS: "Enfermedad y tratamiento actual",
  INTERNACIONES_PREVIAS: "Motivo, a qué edad y cuánto duró",
  CIRUGIAS_PREVIAS: "Cuál y a qué edad",
  TABAQUISMO_HOGAR: "Quién fuma y si lo hace dentro de la casa",
  ANTECEDENTES_FAMILIARES: "Familiar y enfermedad",
};

// Psiquiatría: lo de psicología, más lo que pesa al indicar un psicofármaco.
const DETALLE_PSIQUIATRIA: Partial<Record<AntecedenteValue["tipo"], string>> = {
  ...DETALLE_PSICOLOGIA,
  MEDICACION_PSIQUIATRICA: "Droga, dosis, respuesta y efectos adversos",
  TRATAMIENTO_PSICOLOGICO_PREVIO: "Con quién, enfoque y si continúa",
  NEUROLOGICAS: "Diagnóstico y tratamiento",
  CARDIOPATIAS: "Cuál, ECG y medicación",
  EMBARAZO: "Semanas de gestación o meses de lactancia",
  ALERGIA: "A qué y qué reacción",
};

// Aparato locomotor y oncología: qué conviene anotar en el detalle.
const DETALLE_LOCOMOTOR: Partial<Record<AntecedenteValue["tipo"], string>> = {
  TRAUMATISMOS_PREVIOS: "Qué, dónde y cuándo; cómo se trató",
  CIRUGIAS_PREVIAS: "Cuál, de qué lado y año",
  ARTROSIS: "Qué articulaciones",
  ARTRITIS: "Diagnóstico y tratamiento",
  OSTEOPOROSIS: "Densitometría y tratamiento",
  ENFERMEDADES_AUTOINMUNES: "Cuál y tratamiento",
  ACTIVIDAD_DEPORTIVA: "Deporte o trabajo, frecuencia y nivel",
  ANTICOAGULANTES: "Droga y dosis",
  CORTICOIDES: "Cuál, dosis y desde cuándo",
  DIABETES: "Tipo y medicación",
  ALERGIA: "A qué (AINEs, otros) y qué reacción",
};

const DETALLE_ONCOLOGIA: Partial<Record<AntecedenteValue["tipo"], string>> = {
  QUIMIOTERAPIA_PREVIA: "Esquema, ciclos, fechas y toxicidades",
  RADIOTERAPIA_PREVIA: "Zona, dosis y fechas",
  CIRUGIA_ONCOLOGICA: "Cuál y fecha",
  TRANSFUSIONES: "Cuántas, cuándo y si hubo reacciones",
  DISPOSITIVO_ACCESO_VENOSO: "Tipo, dónde y desde cuándo",
  ANTECEDENTES_FAMILIARES: "Familiar, tipo de cáncer y edad al diagnóstico",
  TRASTORNOS_COAGULACION: "Trombosis (cuándo, dónde) y anticoagulación",
  INMUNOSUPRESION: "Causa y medicación",
  CARDIOPATIAS: "Cuál (importa para la cardiotoxicidad)",
  DIABETES: "Tipo y medicación",
  ALERGIA: "A qué (incluye drogas oncológicas) y qué reacción",
};

// Oftalmología, ORL y dermatología: qué conviene anotar en el detalle.
const DETALLE_OFTALMOLOGIA: Partial<Record<AntecedenteValue["tipo"], string>> = {
  USO_ANTEOJOS_LENTES: "Para lejos, cerca o ambos; desde cuándo",
  GLAUCOMA: "Qué ojo, gotas que usa y quién lo sigue",
  CIRUGIA_OCULAR: "Cuál, qué ojo y año",
  TRAUMATISMO_OCULAR: "Qué pasó, qué ojo y cuándo",
  GLAUCOMA_FAMILIAR: "Familiar y enfermedad",
  DIABETES: "Tipo, desde cuándo y último control de fondo de ojo",
  HTA: "Medicación",
  ENFERMEDADES_AUTOINMUNES: "Cuál y tratamiento",
  CORTICOIDES: "Cuál, vía (gotas, oral, inhalada) y desde cuándo",
  ALERGIA: "A qué (colirios, medicamentos) y qué reacción",
};

const DETALLE_ORL: Partial<Record<AntecedenteValue["tipo"], string>> = {
  OTITIS_REPETICION: "Cuántas por año y tratamiento (tubos, cirugía)",
  HIPOACUSIA: "Qué oído, desde cuándo y si usa audífono",
  ACUFENOS: "Qué oído, continuo o pulsátil, desde cuándo",
  VERTIGO: "Cuánto dura, qué lo desencadena, si gira todo",
  RINOSINUSITIS_CRONICA: "Síntomas, tratamientos y si es alérgica",
  RONQUIDO_APNEAS: "Pausas al dormir, somnolencia, estudios del sueño",
  CIRUGIAS_ORL: "Cuál y año",
  EXPOSICION_RUIDO: "Trabajo o actividad, años y si usa protección",
  USO_PROFESIONAL_VOZ: "Profesión y horas de uso por día",
  ANTICOAGULANTES: "Droga y dosis",
  ALERGIA: "A qué y qué reacción",
};

const DETALLE_DERMATOLOGIA: Partial<Record<AntecedenteValue["tipo"], string>> = {
  DERMATITIS_ATOPICA: "Desde cuándo, zonas y tratamientos",
  PSORIASIS: "Tipo, extensión y tratamientos",
  EXPOSICION_SOLAR: "Trabajo al aire libre, quemaduras con ampollas, camas solares",
  CANCER_PIEL: "Tipo (melanoma, basocelular...), quién y cuándo",
  TRATAMIENTOS_DERMATOLOGICOS_PREVIOS: "Isotretinoína, biológicos, fototerapia...",
  ENFERMEDADES_AUTOINMUNES: "Cuál y tratamiento",
  INMUNOSUPRESION: "Causa y medicación",
  EMBARAZO: "Semanas de gestación o meses de lactancia",
  DIABETES: "Tipo y medicación",
  ALERGIA: "A qué (medicamentos, metales, cosméticos) y qué reacción",
};

// Nutrición: qué conviene anotar en el detalle de cada antecedente.
const DETALLE_NUTRICION: Partial<Record<AntecedenteValue["tipo"], string>> = {
  DIABETES: "Tipo, medicación (insulina, metformina) y último valor",
  DISLIPEMIA: "Último valor y medicación",
  HTA: "Medicación",
  HIPOTIROIDISMO: "Medicación",
  ENFERMEDAD_RENAL: "Estadio, diálisis y restricciones indicadas",
  ENFERMEDADES_DIGESTIVAS: "Reflujo, colon irritable, enfermedad inflamatoria, constipación",
  EMBARAZO: "Semanas de gestación o meses de lactancia",
  ENFERMEDAD_CELIACA: "Desde cuándo y si hace la dieta sin TACC",
  ALERGIA: "A qué alimento y qué reacción",
  INTOLERANCIAS_ALIMENTARIAS: "A qué (lactosa, fructosa...) y qué síntomas",
  TRASTORNOS_CONDUCTA_ALIMENTARIA: "Cuál, desde cuándo y quién lo trata",
  CIRUGIA_BARIATRICA: "Técnica, año y peso previo",
  DIETAS_PREVIAS: "Cuáles, cuánto bajó y si lo recuperó",
  ANTECEDENTES_FAMILIARES: "Familiar y enfermedad",
};

// Salud de la mujer: qué conviene anotar en el detalle de cada antecedente.
const DETALLE_GINECOLOGIA: Partial<Record<AntecedenteValue["tipo"], string>> = {
  EMBARAZO: "Controles, quién la sigue y si es de riesgo",
  COMPLICACIONES_OBSTETRICAS: "Preeclampsia, diabetes gestacional, parto prematuro, hemorragia",
  TRASTORNOS_MENSTRUALES: "Ciclos irregulares, dolor, sangrado abundante",
  INFECCIONES_TRANSMISION_SEXUAL: "Cuál y tratamiento",
  PAP_ALTERADO: "Resultado, año y tratamiento",
  NOD_MAMAS: "Hallazgo, BI-RADS y conducta",
  CIRUGIAS_GINECOLOGICAS: "Cuál y año",
  CANCER_MAMA_OVARIO_FAMILIAR: "Familiar y edad al diagnóstico",
  TRATAMIENTO_HORMONAL: "Cuál (TRH, fertilidad, otro) y desde cuándo",
  TRASTORNOS_COAGULACION: "Trombosis, trombofilia o tratamiento anticoagulante",
  HTA: "Medicación",
  DIABETES: "Tipo y medicación",
  HIPOTIROIDISMO: "Medicación",
  ALERGIA: "A qué y qué reacción",
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
  // Psicología, fonoaudiología y pediatría anotan un detalle libre en vez de
  // la medicación.
  const detalles =
    grupo === "PSICOLOGIA"
      ? DETALLE_PSICOLOGIA
      : grupo === "FONOAUDIOLOGIA"
        ? DETALLE_FONOAUDIOLOGIA
        : grupo === "PSIQUIATRICA"
          ? DETALLE_PSIQUIATRIA
          : grupo === "NUTRICION"
          ? DETALLE_NUTRICION
          : grupo === "OFTALMOLOGICA"
          ? DETALLE_OFTALMOLOGIA
          : grupo === "ORL"
          ? DETALLE_ORL
          : grupo === "DERMATOLOGICA"
          ? DETALLE_DERMATOLOGIA
          : grupo === "LOCOMOTOR"
          ? DETALLE_LOCOMOTOR
          : grupo === "ONCOLOGICA"
          ? DETALLE_ONCOLOGIA
          : grupo === "PEDIATRICA"
          ? DETALLE_PEDIATRIA
          : grupo === "GINECOLOGICA"
            ? DETALLE_GINECOLOGIA
            : null;
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

// Menarca, FUM, fórmula obstétrica y controles (ver ETIQUETAS_GINECOLOGIA).
// Con embarazo marcado y FUM cargada muestra la edad gestacional y la FPP.
function AntecedentesGinecoObstetricos({
  values,
  onChange,
}: {
  values: PatientFormValues;
  onChange: Props["onChange"];
}) {
  type Campo = keyof typeof ETIQUETAS_GINECOLOGIA;
  const campo = (field: Campo, type?: string, helpText?: string) => (
    <TextField
      label={ETIQUETAS_GINECOLOGIA[field]}
      type={type}
      helpText={helpText}
      value={values[field]}
      onChange={(v) => onChange(field, v)}
    />
  );
  const numero = (field: Campo) => (
    <TextField
      label={ETIQUETAS_GINECOLOGIA[field]}
      numeric="digits"
      maxLength={2}
      value={values[field]}
      onChange={(v) => onChange(field, v)}
    />
  );

  const embarazada = values.antecedentes.some((a) => a.tipo === "EMBARAZO" && a.respuesta);
  const eg = embarazada ? edadGestacional(values.fum) : null;
  const formula = formulaObstetrica(values);

  return (
    <FormSection title="Antecedentes gineco-obstétricos" icon={Venus}>
      {campo("menarca", undefined, "Edad")}
      {campo("ritmoMenstrual", undefined, "Ej. 28/5 (cada cuántos días / cuántos días)")}
      {campo(
        "fum",
        "date",
        eg ? `${formatEdadGestacional(eg)} · FPP ${formatFechaCorta(eg.fpp)}` : "Fecha de última menstruación"
      )}
      {campo("menopausia", undefined, "Edad")}

      <div className="col-span-full flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {numero("gestas")}
          {numero("partos")}
          {numero("cesareas")}
          {numero("abortos")}
        </div>
        {formula && <p className="text-xs text-muted-foreground">Fórmula obstétrica: {formula}</p>}
      </div>

      <div className="sm:col-span-2">{campo("metodoAnticonceptivo")}</div>
      <div className="sm:col-span-2 lg:col-span-1">{campo("ultimoPap", undefined, "Fecha y resultado")}</div>
      <div className="sm:col-span-2 lg:col-span-1">
        {campo("ultimaMamografia", undefined, "Fecha y resultado (BI-RADS)")}
      </div>
    </FormSection>
  );
}

export function AntecedentesTab({ values, onAntecedenteChange, onChange, grupo = "MEDICA" }: Props) {
  const saludMental = esSaludMental(grupo);
  // Mastología también atiende hombres: a ellos no se les pregunta la historia
  // gineco-obstétrica.
  const ginecoObstetricos = grupo === "GINECOLOGICA" && values.sexo !== "MASCULINO";
  const byTipo = new Map(values.antecedentes.map((a) => [a.tipo, a]));
  const { columna1, columna2 } = antecedentesPara(grupo);

  const columna = (items: readonly { tipo: AntecedenteValue["tipo"]; label: string }[]) => (
    <div className="flex flex-col gap-3">
      {items.map(({ tipo, label }) => {
        const antecedente = byTipo.get(tipo);
        if (!antecedente) return null;
        if (!antecedenteAplicaAlSexo(tipo, values.sexo, antecedente.respuesta)) return null;
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
      {ginecoObstetricos && <AntecedentesGinecoObstetricos values={values} onChange={onChange} />}

      <div className="grid gap-3 md:grid-cols-2">
        {columna(columna1)}
        {columna(columna2)}
      </div>

      {saludMental && (
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
