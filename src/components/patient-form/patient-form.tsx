"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  History,
  Save,
  Stethoscope,
  TrendingUp,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const TAB_ORDER_CREATE = [
  "datos-personales",
  "consulta-inicial",
  "antecedentes",
  "examen-fisico",
  "diagnostico",
] as const;

const TAB_ORDER_EDIT = [...TAB_ORDER_CREATE, "evolucion"] as const;

export function PatientForm({ mode, patientId, initialValues, initialEvoluciones }: Props) {
  const router = useRouter();
  const [values, setValues] = useState<PatientFormValues>(
    initialValues ?? emptyPatientFormValues()
  );
  const [evoluciones, setEvoluciones] = useState<EvolucionValue[]>(initialEvoluciones ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dniConflict, setDniConflict] = useState<{ id: string; nombreYApellido: string } | null>(
    null
  );
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
    if (field === "nroDocumento") {
      setDniConflict(null);
      setError(null);
    }
  }

  function handleAntecedenteChange(tipo: AntecedenteValue["tipo"], patch: Partial<AntecedenteValue>) {
    setValues((prev) => ({
      ...prev,
      antecedentes: prev.antecedentes.map((a) => (a.tipo === tipo ? { ...a, ...patch } : a)),
    }));
  }

  const tabOrder: readonly string[] = mode === "edit" ? TAB_ORDER_EDIT : TAB_ORDER_CREATE;
  const currentTabIndex = tabOrder.indexOf(activeTab);

  function handlePrevious() {
    setError(null);
    if (currentTabIndex > 0) {
      setActiveTab(tabOrder[currentTabIndex - 1]);
    }
  }

  function handleNext() {
    const missing = REQUIRED_FIELDS.filter(
      (field) => FIELD_TAB[field] === activeTab && isFieldEmpty(values, field)
    );

    if (missing.length > 0) {
      setInvalidFields((prev) => new Set([...prev, ...missing]));
      setError("Completá los campos obligatorios (*) antes de continuar.");
      return;
    }

    setError(null);
    if (currentTabIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentTabIndex + 1]);
    }
  }

  async function handleSubmit(options?: { resolveDniConflict?: boolean }) {
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
    setDniConflict(null);

    const payload = {
      ...values,
      estadoCivil: values.estadoCivil || null,
      evoluciones: [],
      ...(options?.resolveDniConflict ? { resolveDniConflict: true } : {}),
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
        if (response.status === 409 && data.dniConflict) {
          setDniConflict(data.dniConflict);
          setInvalidFields(new Set(["nroDocumento"]));
          setActiveTab("datos-personales");
          return;
        }
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
          <TabsTrigger value="datos-personales">
            <User className="size-4" />
            Datos Personales
          </TabsTrigger>
          <TabsTrigger value="consulta-inicial">
            <ClipboardList className="size-4" />
            Consulta Inicial
          </TabsTrigger>
          <TabsTrigger value="antecedentes">
            <History className="size-4" />
            Antecedentes Personales
          </TabsTrigger>
          <TabsTrigger value="examen-fisico">
            <Stethoscope className="size-4" />
            Exámen Físico
          </TabsTrigger>
          <TabsTrigger value="diagnostico">
            <ClipboardCheck className="size-4" />
            Diagnóstico
          </TabsTrigger>
          {mode === "edit" && (
            <TabsTrigger value="evolucion">
              <TrendingUp className="size-4" />
              Evolución Clínica
            </TabsTrigger>
          )}
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

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentTabIndex <= 0}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleNext}
            disabled={currentTabIndex >= tabOrder.length - 1}
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={() => handleSubmit()} disabled={saving}>
            <Save className="size-4" />
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>

      <Dialog open={dniConflict !== null} onOpenChange={(open) => !open && setDniConflict(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DNI ya utilizado</DialogTitle>
          </DialogHeader>
          {dniConflict && (
            <p className="text-sm text-muted-foreground">
              El DNI <strong className="text-foreground">{values.nroDocumento}</strong> ya está
              asignado a{" "}
              <a
                href={`/patients/${dniConflict.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                {dniConflict.nombreYApellido}
              </a>. 
              <br /><br />
              Podés cancelar y usar otro DNI, o asignárselo a este paciente y dejar sin DNI a{" "}
              {dniConflict.nombreYApellido}.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDniConflict(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit({ resolveDniConflict: true })}
              disabled={saving}
            >
              {saving ? "Asignando..." : "Asignar este DNI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
