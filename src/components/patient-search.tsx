"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

const QUERY_STORAGE_KEY = "patient-search-query";
const SEARCH_DEBOUNCE_MS = 500;

export function PatientSearch() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Restaura el último filtro buscado en esta pestaña — sessionStorage no
    // existe en el servidor, así que esto no puede resolverse con props.
    const saved = sessionStorage.getItem(QUERY_STORAGE_KEY);
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(saved);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") {
      // Limpia resultados stale de una búsqueda previa; sin esto, tipear un
      // nuevo filtro después de borrar todo mostraría por un instante los
      // resultados de la búsqueda anterior mientras arranca el debounce.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPatients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      sessionStorage.setItem(QUERY_STORAGE_KEY, query);
      try {
        const response = await fetch(`/api/patients?q=${encodeURIComponent(trimmed)}`);
        const data = await response.json();
        setPatients(data.patients ?? []);
      } finally {
        setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

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
        <Input
          placeholder="DNI, nombre o apellido..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre y Apellido</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Teléfono</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.trim() === "" && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Escribí un DNI, nombre o apellido para buscar.
                </TableCell>
              </TableRow>
            )}
            {query.trim() !== "" && patients.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {loading ? "Buscando..." : "No se encontraron pacientes."}
                </TableCell>
              </TableRow>
            )}
            {query.trim() !== "" &&
              patients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/patients/${patient.id}`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {patient.nombreYApellido}
                    </Link>
                  </TableCell>
                  <TableCell>{patient.nroDocumento ?? "—"}</TableCell>
                  <TableCell>{patient.telefono ?? "—"}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
