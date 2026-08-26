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
  const fArea = (field: StringField, label: string) => (
    <TextAreaField label={label} rows={3} value={values[field]} onChange={(v) => setField(field, v)} />
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
        {f("craneo", "Cráneo")}
        {f("ojo", "Ojo: Agudeza Visual")}
        {f("oido", "Oído: Agudeza Auditiva")}
        {fArea("pcfg", "Piel, Faneras, Celular Subcutáneo y Ganglios")}
      </FormSection>

      <FormSection title="Cuello" icon={Stethoscope}>
        {f("cuelloPalpacion", "Palpación")}
        {f("cuelloTamanio", "Tamaño")}
        {f("cuelloAuscultacion", "Auscultación")}
      </FormSection>

      <FormSection title="Tórax" icon={HeartPulse}>
        {f("toraxForma", "Forma")}
        {f("toraxMamas", "Mamas")}
        {f("auscultacionMV", "Auscultación M V")}
        {f("auscultacionVV", "Auscultación V V")}
        {f("rales", "Rales")}
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
        {f("ppRenalDerecha", "PP Renal Derecha")}
        {f("ppRenalIzquierda", "PP Renal Izquierda")}
        {fFull("mamas", "Mamas")}
      </FormSection>

      <FormSection title="Sistema Nervioso" icon={Brain}>
        {f("sensorio", "Sensorio")}
        {f("lenguaje", "Lenguaje")}
        {f("marcha", "Marcha")}
        {f("temblor", "Temblor")}
        {f("taxia", "Taxia")}
        {f("reflejosFotomotor", "Reflejo Fotomotor")}
        {f("reflejosAcomodacion", "Reflejos de Acomodación")}
        {f("osteotendinosos", "Reflejos Osteotendinosos")}
        {f("sensibilidad", "Sensibilidad")}
      </FormSection>

      <FormSection title="Osteomuscular" icon={Bone}>
        {fFull("columnaCervical", "Columna Cervical")}
        {f("dorsal", "Dorsal")}
        {f("lumbar", "Lumbar")}
        {fFull("movilidad", "Articulaciones: Movilidad")}
        {fFull("dolor", "Dolor")}
        {fFull("tumefaccion", "Tumefacción")}
      </FormSection>
    </div>
  );
}
