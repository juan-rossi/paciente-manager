import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADO_CIVIL_OPTIONS } from "./constants";
import { FormSection, TextField } from "./fields";
import { calcularEdad } from "./utils";
import type { PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
  invalidFields: Set<string>;
};

export function DatosPersonalesTab({ values, onChange, invalidFields }: Props) {
  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Identidad">
        <div className="col-span-full">
          <TextField
            label="Nombre Y Apellido"
            value={values.nombreYApellido}
            onChange={(v) => onChange("nombreYApellido", v)}
            required
            invalid={invalidFields.has("nombreYApellido")}
          />
        </div>

        <TextField
          label="Nro Documento"
          value={values.nroDocumento}
          onChange={(v) => onChange("nroDocumento", v)}
          required
          invalid={invalidFields.has("nroDocumento")}
          numeric="digits"
        />
        <TextField
          label="Fecha de Nacimiento"
          type="date"
          value={values.fechaNacimiento}
          onChange={(v) => onChange("fechaNacimiento", v)}
          required
          invalid={invalidFields.has("fechaNacimiento")}
        />

        <div className="flex flex-col gap-1.5">
          <Label>Edad</Label>
          <Input value={calcularEdad(values.fechaNacimiento)} readOnly disabled />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sexo *</Label>
          <RadioGroup
            className="flex gap-4 pt-1"
            value={values.sexo}
            onValueChange={(v) => onChange("sexo", v as PatientFormValues["sexo"])}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="MASCULINO"
                id="sexo-masculino"
                className={invalidFields.has("sexo") ? "border-destructive" : undefined}
              />
              <Label htmlFor="sexo-masculino" className="font-normal">
                Masculino
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem
                value="FEMENINO"
                id="sexo-femenino"
                className={invalidFields.has("sexo") ? "border-destructive" : undefined}
              />
              <Label htmlFor="sexo-femenino" className="font-normal">
                Femenino
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <Label>Estado Civil</Label>
          <Select
            value={values.estadoCivil}
            onValueChange={(v) => onChange("estadoCivil", v as PatientFormValues["estadoCivil"])}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {ESTADO_CIVIL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="lg:col-span-2">
          <TextField
            label="Nacionalidad"
            value={values.nacionalidad}
            onChange={(v) => onChange("nacionalidad", v)}
          />
        </div>

        <div className="col-span-full">
          <TextField
            label="Profesión"
            value={values.profesion}
            onChange={(v) => onChange("profesion", v)}
          />
        </div>
      </FormSection>

      <FormSection title="Contacto">
        <div className="col-span-full">
          <TextField
            label="Domicilio"
            value={values.domicilio}
            onChange={(v) => onChange("domicilio", v)}
          />
        </div>

        <TextField
          label="Teléfono"
          value={values.telefono}
          onChange={(v) => onChange("telefono", v)}
          required
          invalid={invalidFields.has("telefono")}
          numeric="phone"
        />
        <div className="lg:col-span-2">
          <TextField
            label="Contacto de Emergencia"
            value={values.contactoEmergencia}
            onChange={(v) => onChange("contactoEmergencia", v)}
          />
        </div>
        <TextField
          label="Teléfono de emergencia"
          value={values.telefonoEmergencia}
          onChange={(v) => onChange("telefonoEmergencia", v)}
          numeric="phone"
        />
      </FormSection>

      <FormSection title="Cobertura de salud">
        <div className="lg:col-span-2">
          <TextField
            label="Obra Social"
            value={values.obraSocial}
            onChange={(v) => onChange("obraSocial", v)}
          />
        </div>
        <div className="lg:col-span-2">
          <TextField
            label="Nro Obra Social"
            value={values.obraSocialNro}
            onChange={(v) => onChange("obraSocialNro", v)}
          />
        </div>
      </FormSection>
    </div>
  );
}
