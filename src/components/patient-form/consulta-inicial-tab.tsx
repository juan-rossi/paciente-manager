import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TextAreaField, TextField } from "./fields";
import type { PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
};

export function ConsultaInicialTab({ values, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
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

      <TextAreaField
        label="Motivo de Consulta"
        value={values.motivoConsulta}
        onChange={(v) => onChange("motivoConsulta", v)}
        rows={3}
      />

      <TextAreaField
        label="Antecedentes de la enfermedad actual"
        helpText="Fecha, hora y forma de comienzo. Descripción de los síntomas. Medicación por médico o automedicación. Episodios anteriores. Síntomas actuales"
        value={values.antecedentesEnfermedad}
        onChange={(v) => onChange("antecedentesEnfermedad", v)}
        rows={5}
      />

      <div className="flex flex-col gap-2">
        <Label>Hábitos Tóxicos</Label>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="habito-alcohol"
              checked={values.habitoAlcohol}
              onCheckedChange={(checked) => onChange("habitoAlcohol", checked === true)}
            />
            <Label htmlFor="habito-alcohol" className="font-normal">
              Alcohol
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="habito-cigarrillos"
              checked={values.habitoCigarrillos}
              onCheckedChange={(checked) => onChange("habitoCigarrillos", checked === true)}
            />
            <Label htmlFor="habito-cigarrillos" className="font-normal">
              Cigarrillos
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="habito-drogas"
              checked={values.habitoDrogas}
              onCheckedChange={(checked) => onChange("habitoDrogas", checked === true)}
            />
            <Label htmlFor="habito-drogas" className="font-normal">
              Drogas
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
