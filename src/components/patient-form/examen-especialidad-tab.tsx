import { Bone, Eye, Ear, ScanSearch, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSection, TextAreaField, TextField } from "./fields";
import type { CampoExamen, ExamenEspecialidad, FilaBilateral } from "./examenes-especialidad";
import type { PatientFormValues } from "./types";

type Props = {
  examen: ExamenEspecialidad;
  values: PatientFormValues;
  onChange: <K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) => void;
};

const ICONOS: Record<string, LucideIcon> = {
  "Examen oftalmológico": Eye,
  "Examen otorrinolaringológico": Ear,
  "Examen osteoarticular": Bone,
};

// Cuántos campos "mitad" seguidos hay justo antes de `idx` (para armar pares).
function mitadesSeguidas(campos: readonly CampoExamen[], idx: number): number {
  let n = 0;
  for (let k = idx - 1; k >= 0 && campos[k].largo && campos[k].mitad; k--) n++;
  return n;
}

// Examen de órgano (oftalmología, ORL, dermatología) en lugar del examen
// físico general. Las filas bilaterales se cargan lado a lado (OD | OI).
export function ExamenEspecialidadTab({ examen, values, onChange }: Props) {
  const Icono = ICONOS[examen.titulo] ?? ScanSearch;

  const bilateral = (fila: FilaBilateral, lados: [string, string]) => {
    const Control = fila.largo ? Textarea : Input;
    return (
      <div
        key={fila.label}
        className="col-span-full grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-start sm:gap-x-8"
      >
        <div className="flex flex-col gap-0.5 sm:pt-2">
          <Label>{fila.label}</Label>
          {fila.ayuda && <p className="text-xs text-muted-foreground">{fila.ayuda}</p>}
        </div>
        {([
          [fila.derecho, lados[0]],
          [fila.izquierdo, lados[1]],
        ] as const).map(([campo, lado]) => (
          <div key={campo} className="flex items-start gap-2">
            <span className="w-7 shrink-0 pt-2 text-xs font-semibold text-muted-foreground">{lado}</span>
            <Control
              aria-label={`${fila.label} ${lado}`}
              rows={fila.largo ? 2 : undefined}
              value={values[campo]}
              onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => onChange(campo, e.target.value)}
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {examen.secciones.map((seccion) => (
        <FormSection
          key={seccion.titulo}
          title={seccion.titulo}
          icon={Icono}
          contentClassName="sm:grid-cols-2 lg:grid-cols-2"
        >
          {seccion.bilaterales?.map((fila) => bilateral(fila, seccion.lados ?? ["D", "I"]))}
          {seccion.campos?.map((c, idx, campos) =>
            c.largo ? (
              <div
                key={c.campo}
                className={
                  !c.mitad
                    ? "col-span-full"
                    : // El primero de cada par de "mitad" arranca fila nueva,
                      // así los dos quedan juntos aunque antes haya un campo
                      // corto ocupando media fila.
                      mitadesSeguidas(campos, idx) % 2 === 0
                      ? "sm:col-start-1"
                      : undefined
                }
              >
                <TextAreaField
                  label={c.label}
                  helpText={c.ayuda}
                  rows={2}
                  value={values[c.campo]}
                  onChange={(v) => onChange(c.campo, v)}
                />
              </div>
            ) : (
              <TextField
                key={c.campo}
                label={c.label}
                helpText={c.ayuda}
                value={values[c.campo]}
                onChange={(v) => onChange(c.campo, v)}
              />
            )
          )}
        </FormSection>
      ))}
    </div>
  );
}
