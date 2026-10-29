import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MedicosFiltros } from "@/components/admin/medicos-filtros";
import {
  getMedicos,
  formatDiasParaVencer,
  formatFechaCorta,
  type MedicosFiltros as MedicosFiltrosType,
} from "@/lib/admin-metrics";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; estado?: string; plan?: string; vencimiento?: string }>;

export default async function AdminMedicosPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtros: MedicosFiltrosType = {
    q: sp.q,
    estado: sp.estado === "ACTIVO" || sp.estado === "INACTIVO" ? sp.estado : undefined,
    plan: sp.plan === "TRIAL" || sp.plan === "BASICA" || sp.plan === "PREMIUM" ? sp.plan : undefined,
    vencimiento: sp.vencimiento === "7" || sp.vencimiento === "30" || sp.vencimiento === "VENCIDO" ? sp.vencimiento : undefined,
  };

  const medicos = await getMedicos(filtros);
  const requierenAtencion = medicos.filter(
    (m) => m.estado === "ACTIVO" && m.diasParaVencer !== null && m.diasParaVencer <= 7
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold">Médicos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {medicos.length} médico{medicos.length === 1 ? "" : "s"} registrado{medicos.length === 1 ? "" : "s"}
            {requierenAtencion > 0 && ` · ${requierenAtencion} requiere${requierenAtencion === 1 ? "" : "n"} atención`}
          </p>
        </div>
        {/* La exportación real (CSV server-side) queda para una siguiente
            iteración -- el botón queda deshabilitado para no prometer algo
            que todavía no existe. */}
        <Button type="button" variant="outline" disabled title="Próximamente">
          <Download className="size-3.5" />
          Exportar CSV
        </Button>
      </div>

      <Suspense fallback={<div className="h-8" />}>
        <MedicosFiltros q={sp.q ?? ""} estado={sp.estado ?? ""} plan={sp.plan ?? ""} vencimiento={sp.vencimiento ?? ""} />
      </Suspense>

      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Médico</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {medicos.length === 0 && (
              <TableRow className="bg-white">
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No hay médicos que coincidan con estos filtros.
                </TableCell>
              </TableRow>
            )}
            {medicos.map((m) => {
              const bajoUso = m.pacientesCount <= 5 && m.turnosCount <= 10;
              return (
                <TableRow key={m.id} className="bg-white">
                  <TableCell>
                    <Link href={`/admin/medicos/${m.id}`} className="flex flex-col gap-0.5">
                      <span className="font-medium">{m.nombreCompleto}</span>
                      <span className="text-xs text-muted-foreground">{m.email}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {m.estado === "ACTIVO" ? (
                      <Badge
                        variant="outline"
                        className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                      >
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{m.planLabel}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatFechaCorta(m.createdAt)}</TableCell>
                  <TableCell>
                    {m.vencimiento ? (
                      <div className="flex flex-col gap-0.5">
                        <span>{formatFechaCorta(m.vencimiento)}</span>
                        <span
                          className={
                            m.diasParaVencer !== null && m.diasParaVencer < 0
                              ? "text-xs text-muted-foreground"
                              : m.diasParaVencer !== null && m.diasParaVencer <= 3
                                ? "text-xs font-medium text-destructive"
                                : m.diasParaVencer !== null && m.diasParaVencer <= 7
                                  ? "text-xs font-medium text-amber-700 dark:text-amber-400"
                                  : "text-xs text-muted-foreground"
                          }
                        >
                          {formatDiasParaVencer(m.diasParaVencer)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>
                        {m.pacientesCount} pac · {m.turnosCount} turnos
                      </span>
                      {bajoUso && (
                        <Badge
                          variant="outline"
                          className="h-[18px] border-amber-300 px-1.5 text-[10.5px] text-amber-700 dark:border-amber-800 dark:text-amber-400"
                        >
                          bajo uso
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/medicos/${m.id}`} className="text-muted-foreground hover:text-foreground">
                      <ChevronRight className="size-4" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
    </div>
  );
}
