import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TextField } from "./fields";
import type { PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
};

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 pb-4 pt-1 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

type StringField = {
  [K in keyof PatientFormValues]: PatientFormValues[K] extends string ? K : never;
}[keyof PatientFormValues];

export function ExamenFisicoTab({ values, onChange }: Props) {
  const setField = onChange as (field: StringField, value: string) => void;
  const f = (field: StringField, label: string) => (
    <TextField label={label} value={values[field]} onChange={(v) => setField(field, v)} />
  );

  return (
    <Accordion multiple defaultValue={["signos-vitales", "osteomuscular"]} className="w-full">
      <AccordionItem value="signos-vitales">
        <AccordionTrigger>Signos Vitales</AccordionTrigger>
        <AccordionContent>
          <Grid>
            {f("frecuenciaCardiaca", "Frecuencia Cardíaca")}
            {f("pulsoRadial", "Pulso Radial")}
            {f("ritmo", "Ritmo")}
            {f("presionArterial", "Presión Arterial")}
            {f("frecuenciaRespiratoria", "Frecuencia Respiratoria")}
            {f("pesoActual", "Peso Actual")}
            {f("pesoHabitual", "Peso Habitual")}
            {f("estatura", "Estatura")}
            {f("temperatura", "Temperatura")}
          </Grid>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cabeza-torax">
        <AccordionTrigger>Cabeza, Tórax y Cardiovascular</AccordionTrigger>
        <AccordionContent>
          <Grid>
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
          </Grid>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cuello">
        <AccordionTrigger>Cuello</AccordionTrigger>
        <AccordionContent>
          <Grid>
            {f("cuelloPalpacion", "Palpación")}
            {f("cuelloTamanio", "Tamaño")}
            {f("cuelloAuscultacion", "Auscultación")}
          </Grid>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="abdomen">
        <AccordionTrigger>Abdomen</AccordionTrigger>
        <AccordionContent>
          <Grid>
            {f("abdomenInspeccion", "Inspección")}
            {f("abdomenPalpacion", "Palpación")}
            {f("abdomenAuscultacion", "Auscultación")}
          </Grid>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="osteomuscular">
        <AccordionTrigger>Osteomuscular</AccordionTrigger>
        <AccordionContent>
          <Grid>
            {f("columnaCervical", "Columna Cervical")}
            {f("dorsal", "Dorsal")}
            {f("lumbar", "Lumbar")}
            {f("articulaciones", "Articulaciones: Movilidad")}
            {f("movilidad", "Movilidad")}
            {f("dolor", "Dolor")}
            {f("tumefaccion", "Tumefacción")}
          </Grid>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="sistema-nervioso">
        <AccordionTrigger>Sistema Nervioso</AccordionTrigger>
        <AccordionContent>
          <Grid>
            {f("sensorio", "Sensorio")}
            {f("lenguaje", "Lenguaje")}
            {f("marcha", "Marcha")}
            {f("temblor", "Temblor")}
            {f("taxia", "Taxia")}
            {f("reflejosFotomotor", "Reflejos Fotomotor")}
            {f("reflejosAcomodacion", "Reflejos Acomodación")}
            {f("osteotendinosos", "Osteotendinosos")}
            {f("sensibilidad", "Sensibilidad")}
          </Grid>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
