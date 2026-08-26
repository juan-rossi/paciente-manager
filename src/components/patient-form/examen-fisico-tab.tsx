import {
  Activity,
  Bone,
  Brain,
  Droplet,
  Heart,
  HeartPulse,
  ScanFace,
  Stethoscope,
  Waves,
} from "lucide-react";
import { FormSection, TextAreaField, TextField } from "./fields";
import type { PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
};

type StringField = {
  [K in keyof PatientFormValues]: PatientFormValues[K] extends string ? K : never;
}[keyof PatientFormValues];

export function ExamenFisicoTab({ values, onChange }: Props) {
  const setField = onChange as (field: StringField, value: string) => void;
  const f = (field: StringField, label: string) => (
    <TextField label={label} value={values[field]} onChange={(v) => setField(field, v)} />
  );
  const fFull = (field: StringField, label: string) => (
    <div className="col-span-full">
      <TextField label={label} value={values[field]} onChange={(v) => setField(field, v)} />
    </div>
  );
  const fSpan = (field: StringField, label: string, span: 2 | 3) => (
    <div className={span === 2 ? "sm:col-span-2" : "sm:col-span-2 lg:col-span-3"}>
      <TextField label={label} value={values[field]} onChange={(v) => setField(field, v)} />
    </div>
  );
  const fArea = (field: StringField, label: string) => (
    <div className="col-span-full">
      <TextAreaField label={label} rows={3} value={values[field]} onChange={(v) => setField(field, v)} />
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Signos Vitales" icon={Activity}>
        {f("frecuenciaCardiaca", "Frecuencia Cardíaca")}
        {f("pulsoRadial", "Pulso Radial")}
        {f("ritmo", "Ritmo")}
        {f("presionArterial", "Presión Arterial")}
        {f("frecuenciaRespiratoria", "Frecuencia Respiratoria")}
        <div className="grid grid-cols-2 gap-4">
          {f("pesoActual", "Peso Actual")}
          {f("pesoHabitual", "Peso Habitual")}
        </div>
        {f("estatura", "Estatura")}
        {f("temperatura", "Temperatura")}
      </FormSection>

      <FormSection title="Cabeza" icon={ScanFace}>
        {fSpan("craneo", "Cráneo", 2)}
        {f("ojo", "Ojo: Agudeza Visual")}
        {f("oido", "Oído: Agudeza Auditiva")}
        {fArea("pcfg", "Piel, Faneras, Celular Subcutáneo y Ganglios")}
      </FormSection>

      <FormSection title="Cuello" icon={Stethoscope}>
        {f("cuelloPalpacion", "Palpación")}
        {f("cuelloTamanio", "Tamaño")}
        <div className="sm:col-span-2">
          <TextField
            label="Auscultación"
            value={values.cuelloAuscultacion}
            onChange={(v) => setField("cuelloAuscultacion", v)}
          />
        </div>
      </FormSection>

      <FormSection title="Tórax" icon={HeartPulse}>
        {f("toraxForma", "Forma")}
        {fSpan("toraxMamas", "Mamas", 3)}
        <div className="col-span-full grid grid-cols-3 gap-4">
          {f("auscultacionMV", "Auscultación M V")}
          {f("auscultacionVV", "Auscultación V V")}
          {f("rales", "Rales")}
        </div>
        {fArea("excursion", "Excursión de Bases y Vértices")}
      </FormSection>

      <FormSection title="Aparato Cardiovascular" icon={Heart}>
        {f("acvR1", "R1")}
        {f("acvR2", "R2")}
        {f("soplos", "Soplos")}
        {f("carotideo", "Pulso Carotídeo")}
        {f("radial", "Pulso Radial")}
        {f("femoral", "Pulso Femoral")}
        {f("pedio", "Pedio")}
      </FormSection>

      <FormSection title="Abdomen" icon={Waves}>
        {fFull("abdomenInspeccion", "Inspección")}
        {fFull("abdomenPalpacion", "Palpación")}
        {fFull("abdomenAuscultacion", "Auscultación")}
      </FormSection>

      <FormSection title="Aparato Genito-Urinario" icon={Droplet}>
        {fSpan("ppRenalDerecha", "PP Renal Derecha", 2)}
        {fSpan("ppRenalIzquierda", "PP Renal Izquierda", 2)}
        {fFull("mamas", "Mamas")}
      </FormSection>

      <FormSection title="Sistema Nervioso" icon={Brain}>
        {f("sensorio", "Sensorio")}
        {f("lenguaje", "Lenguaje")}
        <div className="grid grid-cols-2 gap-4">
          {f("marcha", "Marcha")}
          {f("temblor", "Temblor")}
        </div>
        {f("taxia", "Taxia")}
        {f("reflejosFotomotor", "Reflejo Fotomotor")}
        {f("reflejosAcomodacion", "Reflejos de Acomodación")}
        {f("osteotendinosos", "Reflejos Osteotendinosos")}
        {f("sensibilidad", "Sensibilidad")}
      </FormSection>

      <FormSection title="Osteomuscular" icon={Bone}>
        {fFull("columnaCervical", "Columna Cervical")}
        {fSpan("dorsal", "Dorsal", 2)}
        {fSpan("lumbar", "Lumbar", 2)}
        {fFull("movilidad", "Articulaciones: Movilidad")}
        {fFull("dolor", "Dolor")}
        {fFull("tumefaccion", "Tumefacción")}
      </FormSection>
    </div>
  );
}
