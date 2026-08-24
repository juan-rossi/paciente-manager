"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PatientRow = {
  id: string;
  nombreYApellido: string;
  nroDocumento: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
};

type Props = {
  initialPatients: PatientRow[];
};

export function PatientSearch({ initialPatients }: Props) {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>(initialPatients);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearched(true);
    setLoading(true);
    try {
      const response = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setPatients(data.patients ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Buscar pacientes</CardTitle>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/patients/new">+ Nuevo paciente</Link>}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="DNI, nombre o apellido..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Buscando..." : "Buscar"}
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre y Apellido</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-right">Ver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {searched ? "No se encontraron pacientes." : "Últimos pacientes cargados."}
                </TableCell>
              </TableRow>
            )}
            {patients.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell className="font-medium">{patient.nombreYApellido}</TableCell>
                <TableCell>{patient.nroDocumento ?? "—"}</TableCell>
                <TableCell>{patient.telefono ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/patients/${patient.id}`}>Abrir</Link>}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
