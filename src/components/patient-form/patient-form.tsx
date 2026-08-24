"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { DatosPersonalesTab } from "./datos-personales-tab";
import { ConsultaInicialTab } from "./consulta-inicial-tab";
import { AntecedentesTab } from "./antecedentes-tab";
import { ExamenFisicoTab } from "./examen-fisico-tab";
import { DiagnosticoTab } from "./diagnostico-tab";
import { EvolucionTab } from "./evolucion-tab";
import { emptyPatientFormValues } from "./utils";
import type { AntecedenteValue, EvolucionValue, PatientFormValues } from "./types";

type Props = {
  mode: "create" | "edit";
  patientId?: string;
  initialValues?: PatientFormValues;
  initialEvoluciones?: EvolucionValue[];
};

const REQUIRED_FIELDS = [
  "nombreYApellido",
  "fechaNacimiento",
  "sexo",
  "estadoCivil",
  "nroDocumento",
  "domicilio",
  "telefono",
  "contactoEmergencia",
  "telefonoEmergencia",
  "motivoConsulta",
] as const satisfies readonly (keyof PatientFormValues)[];

const FIELD_TAB: Record<(typeof REQUIRED_FIELDS)[number], string> = {
  nombreYApellido: "datos-personales",
  fechaNacimiento: "datos-personales",
  sexo: "datos-personales",
  estadoCivil: "datos-personales",
  nroDocumento: "datos-personales",
  domicilio: "datos-personales",
  telefono: "datos-personales",
  contactoEmergencia: "datos-personales",
  telefonoEmergencia: "datos-personales",
  motivoConsulta: "consulta-inicial",
};

function isFieldEmpty(values: PatientFormValues, field: (typeof REQUIRED_FIELDS)[number]) {
  const value = values[field];
  return typeof value === "string" ? value.trim().length === 0 : !value;
}

export function PatientForm({ mode, patientId, initialValues, initialEvoluciones }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<PatientFormValues>(
    initialValues ?? emptyPatientFormValues()
  );
  const [evoluciones, setEvoluciones] = useState<EvolucionValue[]>(initialEvoluciones ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("datos-personales");
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());

  function handleChange<K extends keyof PatientFormValues>(field: K, value: PatientFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setInvalidFields((prev) => {
      if (!prev.has(field as string)) return prev;
      const next = new Set(prev);
      next.delete(field as string);
      return next;
    });
  }

  function handleAntecedenteChange(tipo: AntecedenteValue["tipo"], patch: Partial<AntecedenteValue>) {
    setValues((prev) => ({
      ...prev,
      antecedentes: prev.antecedentes.map((a) => (a.tipo === tipo ? { ...a, ...patch } : a)),
    }));
  }

  async function handleSubmit() {
    const missing = REQUIRED_FIELDS.filter((field) => isFieldEmpty(values, field));

    if (missing.length > 0) {
      setInvalidFields(new Set(missing));
      setError("Completá los campos obligatorios (*).");
      setActiveTab(FIELD_TAB[missing[0]]);
      return;
    }

    setInvalidFields(new Set());
    setSaving(true);
    setError(null);

    const payload = {
      ...values,
      estadoCivil: values.estadoCivil || null,
      evoluciones: [],
    };

    try {
      const url = mode === "create" ? "/api/patients" : `/api/patients/${patientId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar el paciente.");
        return;
      }

      router.push(`/patients/${data.patient.id}`);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)}>
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="datos-personales">Datos Personales</TabsTrigger>
          <TabsTrigger value="consulta-inicial">Consulta Inicial</TabsTrigger>
          <TabsTrigger value="antecedentes">Antecedentes Personales</TabsTrigger>
          <TabsTrigger value="examen-fisico">Exámen Físico</TabsTrigger>
          <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
          {mode === "edit" && <TabsTrigger value="evolucion">Evolución Clínica</TabsTrigger>}
        </TabsList>

        <Card className="mt-2">
          <CardContent>
            <TabsContent value="datos-personales">
              <DatosPersonalesTab
                values={values}
                onChange={handleChange}
                invalidFields={invalidFields}
              />
            </TabsContent>
            <TabsContent value="consulta-inicial">
              <ConsultaInicialTab
                values={values}
                onChange={handleChange}
                invalidFields={invalidFields}
              />
            </TabsContent>
            <TabsContent value="antecedentes">
              <AntecedentesTab values={values} onAntecedenteChange={handleAntecedenteChange} />
            </TabsContent>
            <TabsContent value="examen-fisico">
              <ExamenFisicoTab values={values} onChange={handleChange} />
            </TabsContent>
            <TabsContent value="diagnostico">
              <DiagnosticoTab values={values} onChange={handleChange} />
            </TabsContent>
            {mode === "edit" && (
              <TabsContent value="evolucion">
                <EvolucionTab
                  patientId={patientId}
                  evoluciones={evoluciones}
                  onChangeEvoluciones={setEvoluciones}
                />
              </TabsContent>
            )}
          </CardContent>
        </Card>
      </Tabs>

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Guardando..." : "Guardar"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
