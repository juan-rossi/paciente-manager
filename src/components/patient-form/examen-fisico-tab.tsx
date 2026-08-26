import { Activity, Bone, Brain, HeartPulse, ScanFace, Waves } from "lucide-react";
import { FormSection, TextField } from "./fields";
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

      <FormSection title="Cabeza, Tórax y Cardiovascular" icon={HeartPulse}>
        {f("craneo", "Cráneo")}
        {f("ojo", "Ojo")}
        {f("oido", "Oído")}
        {f("pcfg", "PCFG")}
        {f("toraxForma", "Tórax - Forma")}
        {f("toraxMamas", "Tórax - Mamas")}
        {f("auscultacionMV", "Auscultación MV")}
        {f("auscultacionVV", "Auscultación VV")}
        {f("rales", "Rales")}
        {f("excursion", "Excursión")}
        {f("acvR1", "ACV R1")}
        {f("acvR2", "ACV R2")}
        {f("soplos", "Soplos")}
        {f("carotideo", "Carotídeo")}
        {f("radial", "Radial")}
        {f("femoral", "Femoral")}
        {f("pedio", "Pedio")}
        {f("ppRenalDerecha", "PP Renal Derecha")}
        {f("ppRenalIzquierda", "PP Renal Izquierda")}
        {f("mamas", "Mamas")}
      </FormSection>

      <FormSection title="Cuello" icon={ScanFace}>
        {f("cuelloPalpacion", "Palpación")}
        {f("cuelloTamanio", "Tamaño")}
        {f("cuelloAuscultacion", "Auscultación")}
      </FormSection>

      <FormSection title="Abdomen" icon={Waves}>
        {f("abdomenInspeccion", "Inspección")}
        {f("abdomenPalpacion", "Palpación")}
        {f("abdomenAuscultacion", "Auscultación")}
      </FormSection>

      <FormSection title="Osteomuscular" icon={Bone}>
        {f("columnaCervical", "Columna Cervical")}
        {f("dorsal", "Dorsal")}
        {f("lumbar", "Lumbar")}
        {f("articulaciones", "Articulaciones: Movilidad")}
        {f("movilidad", "Movilidad")}
        {f("dolor", "Dolor")}
        {f("tumefaccion", "Tumefacción")}
      </FormSection>

      <FormSection title="Sistema Nervioso" icon={Brain}>
        {f("sensorio", "Sensorio")}
        {f("lenguaje", "Lenguaje")}
        {f("marcha", "Marcha")}
        {f("temblor", "Temblor")}
        {f("taxia", "Taxia")}
        {f("reflejosFotomotor", "Reflejos Fotomotor")}
        {f("reflejosAcomodacion", "Reflejos Acomodación")}
        {f("osteotendinosos", "Osteotendinosos")}
        {f("sensibilidad", "Sensibilidad")}
      </FormSection>
    </div>
  );
}
