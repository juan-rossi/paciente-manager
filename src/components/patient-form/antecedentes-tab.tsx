import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ANTECEDENTES_COLUMNA_1, ANTECEDENTES_COLUMNA_2 } from "./constants";
import type { AntecedenteValue, PatientFormValues } from "./types";

type Props = {
  values: PatientFormValues;
  onAntecedenteChange: (tipo: AntecedenteValue["tipo"], patch: Partial<AntecedenteValue>) => void;
};

function AntecedenteRow({
  tipo,
  label,
  antecedente,
  onChange,
}: {
  tipo: AntecedenteValue["tipo"];
  label: string;
  antecedente: AntecedenteValue;
  onChange: (patch: Partial<AntecedenteValue>) => void;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-1">
        <Label className="w-32 shrink-0 whitespace-nowrap font-medium">{label}</Label>
        <RadioGroup
          className="flex shrink-0 gap-4"
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

      {antecedente.respuesta && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[3fr_7fr]">
          <Input
            type="date"
            value={antecedente.fechaInicio}
            onChange={(e) => onChange({ fechaInicio: e.target.value })}
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
      )}
    </div>
  );
}

export function AntecedentesTab({ values, onAntecedenteChange }: Props) {
  const byTipo = new Map(values.antecedentes.map((a) => [a.tipo, a]));

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        {ANTECEDENTES_COLUMNA_1.map(({ tipo, label }) => {
          const antecedente = byTipo.get(tipo);
          if (!antecedente) return null;
          return (
            <AntecedenteRow
              key={tipo}
              tipo={tipo}
              label={label}
              antecedente={antecedente}
              onChange={(patch) => onAntecedenteChange(tipo, patch)}
            />
          );
        })}
      </div>
      <div className="flex flex-col gap-3">
        {ANTECEDENTES_COLUMNA_2.map(({ tipo, label }) => {
          const antecedente = byTipo.get(tipo);
          if (!antecedente) return null;
          return (
            <AntecedenteRow
              key={tipo}
              tipo={tipo}
              label={label}
              antecedente={antecedente}
              onChange={(patch) => onAntecedenteChange(tipo, patch)}
            />
          );
        })}
      </div>
    </div>
  );
}
