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
import { BonificadoBadge } from "@/components/admin/bonificado-badge";
import { EstadoMedicoBadge } from "@/components/admin/estado-medico-badge";
import { SANCION_LABELS } from "@/lib/sanciones";
import {
  getMedicos,
  formatDiasParaVencer,
  formatFechaCorta,
  type MedicosFiltros as MedicosFiltrosType,
} from "@/lib/admin-metrics";
import { PageEnter } from "@/components/page-transition";
import {
  MedicosSortHead,
  ORDENES_MEDICOS,
  DIRECCION_INICIAL,
  type OrdenMedicos,
  type DireccionOrden,
} from "@/components/admin/medicos-sort-head";
import { verificarAdminEnPagina } from "@/lib/admin-page";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  estado?: string;
  plan?: string;
  tipo?: string;
  vencimiento?: string;
  orden?: string;
  dir?: string;
}>;

const RANGO_ESTADO: Record<string, number> = { ACTIVO: 0, INACTIVO: 1, SUSPENDIDO: 2 };
const RANGO_PLAN: Record<string, number> = { BASICA: 0, PREMIUM: 1 };
const RANGO_TIPO: Record<string, number> = { TRIAL: 0, PAGO: 1, BONIFICADO: 2 };

type MedicoFila = Awaited<ReturnType<typeof getMedicos>>[number];

function ordenarMedicos(medicos: MedicoFila[], orden: OrdenMedicos, dir: DireccionOrden): MedicoFila[] {
  const signo = dir === "asc" ? 1 : -1;
  const porNombre = (a: MedicoFila, b: MedicoFila) =>
    a.nombreCompleto.localeCompare(b.nombreCompleto, "es", { sensitivity: "base" });

  return [...medicos].sort((a, b) => {
    let c = 0;
    switch (orden) {
      case "medico":
        return signo * porNombre(a, b);
      case "estado":
        c = (RANGO_ESTADO[a.estado] ?? 9) - (RANGO_ESTADO[b.estado] ?? 9);
        break;
      case "plan":
        c = (RANGO_PLAN[a.tier] ?? 9) - (RANGO_PLAN[b.tier] ?? 9);
        break;
      case "tipo":
        c = (RANGO_TIPO[a.tipo] ?? 9) - (RANGO_TIPO[b.tipo] ?? 9);
        break;
      case "alta":
        c = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case "vence":
        // Sin vencimiento siempre al final, en cualquier dirección.
        if (!a.vencimiento || !b.vencimiento) {
          if (a.vencimiento === b.vencimiento) return porNombre(a, b);
          return a.vencimiento ? -1 : 1;
        }
        c = a.vencimiento.getTime() - b.vencimiento.getTime();
        break;
      case "uso":
        c = a.pacientesCount - b.pacientesCount || a.turnosCount - b.turnosCount;
        break;
    }
    return signo * c || porNombre(a, b);
  });
}

export default async function AdminMedicosPage({ searchParams }: { searchParams: SearchParams }) {
  await verificarAdminEnPagina();
  const sp = await searchParams;
  const filtros: MedicosFiltrosType = {
    q: sp.q,
    estado: sp.estado === "ACTIVO" || sp.estado === "INACTIVO" || sp.estado === "SUSPENDIDO" ? sp.estado : undefined,
    plan: sp.plan === "BASICA" || sp.plan === "PREMIUM" ? sp.plan : undefined,
    tipo: sp.tipo === "TRIAL" || sp.tipo === "PAGO" || sp.tipo === "BONIFICADO" ? sp.tipo : undefined,
    vencimiento: sp.vencimiento === "7" || sp.vencimiento === "30" || sp.vencimiento === "VENCIDO" ? sp.vencimiento : undefined,  };

  const orden = ORDENES_MEDICOS.find((o) => o === sp.orden);
  const dir: DireccionOrden | undefined = orden
    ? sp.dir === "asc" || sp.dir === "desc"
      ? sp.dir
      : DIRECCION_INICIAL[orden]
    : undefined;

  const medicosFiltrados = await getMedicos(filtros);
  // Sin `orden` se respeta el orden por defecto de getMedicos (urgentes primero).
  const medicos = orden && dir ? ordenarMedicos(medicosFiltrados, orden, dir) : medicosFiltrados;
  const sortProps = { ordenActual: orden, dirActual: dir, params: sp };
  const requierenAtencion = medicos.filter(
    (m) => m.estado === "ACTIVO" && m.diasParaVencer !== null && m.diasParaVencer <= 7
  ).length;

  return (
    <PageEnter>
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
          <MedicosFiltros q={sp.q ?? ""} estado={sp.estado ?? ""} plan={sp.plan ?? ""} tipo={sp.tipo ?? ""} vencimiento={sp.vencimiento ?? ""} />
        </Suspense>

        <Table>
            <TableHeader>
              <TableRow>
                <MedicosSortHead columna="medico" label="Médico" {...sortProps} />
                <MedicosSortHead columna="estado" label="Estado" {...sortProps} />
                <MedicosSortHead columna="plan" label="Plan" {...sortProps} />
                <MedicosSortHead columna="tipo" label="Tipo" {...sortProps} />
                <MedicosSortHead columna="alta" label="Alta" {...sortProps} />
                <MedicosSortHead columna="vence" label="Vence" {...sortProps} />
                <MedicosSortHead columna="uso" label="Uso" {...sortProps} />
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicos.length === 0 && (
                <TableRow className="bg-white">
                  <TableCell colSpan={8}className="py-8 text-center text-sm text-muted-foreground">
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
                      <EstadoMedicoBadge estado={m.estado} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">{m.tier === "PREMIUM" ? "Premium" : "Básico"}</Badge>
                        {/* La suspensión ya se ve en Estado. */}
                        {m.sancion === "FUERA_DEL_DIRECTORIO" && (
                          <Badge variant="destructive">{SANCION_LABELS[m.sancion]}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.tipo === "BONIFICADO" ? (
                        <BonificadoBadge />
                      ) : m.tipo === "TRIAL" ? (
                        <Badge variant="outline">Trial</Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-400"
                        >
                          Pago
                        </Badge>
                      )}
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
    </PageEnter>
  );
}
