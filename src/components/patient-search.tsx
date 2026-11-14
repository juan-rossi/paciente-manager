"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
    // Sin filtro, la API devuelve los últimos 20 pacientes vistos
    // (ver `pacientesRecientes`). Se pide sin debounce: no hay tipeo que esperar.
    const isRecent = trimmed === "";

    // Limpia resultados stale del modo anterior (búsqueda ↔ recientes); sin
    // esto se verían por un instante mientras arranca el fetch/debounce.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPatients([]);
    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(
      async () => {
        if (isRecent) sessionStorage.removeItem(QUERY_STORAGE_KEY);
        else sessionStorage.setItem(QUERY_STORAGE_KEY, query);
        try {
          const response = await fetch(
            `/api/patients?q=${encodeURIComponent(trimmed)}`,
          );
          const data = await response.json();
          if (!cancelled) setPatients(data.patients ?? []);
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      isRecent ? 0 : SEARCH_DEBOUNCE_MS,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const isRecent = query.trim() === "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Buscar pacientes</CardTitle>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          className="hidden sm:inline-flex"
          render={<Link href="/patients/eliminados" />}
        >
          <Trash2 className="size-4" />
          Papelera
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input
          placeholder="DNI, nombre o apellido..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        {isRecent && (
          <p className="-mb-2 text-sm font-medium text-muted-foreground">
            Últimos pacientes vistos
          </p>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre y Apellido</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="text-center text-muted-foreground"
                >
                  {loading
                    ? isRecent
                      ? "Cargando..."
                      : "Buscando..."
                    : isRecent
                      ? "Todavía no hay pacientes cargados."
                      : "No se encontraron pacientes."}
                </TableCell>
              </TableRow>
            )}
            {patients.map((patient) => (
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
                <TableCell className="hidden sm:table-cell">
                  {patient.telefono ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
