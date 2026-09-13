import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EliminadosTable } from "@/components/eliminados-table";

const PAGE_SIZE = 20;
const RETENCION_ANIOS = 10;

type Props = { searchParams: Promise<{ page?: string }> };

export default async function PacientesEliminadosPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DOCTOR") notFound();

  const { page: pageParam } = await searchParams;
  const requestedPage = Math.max(1, Number(pageParam) || 1);

  const desde = new Date();
  desde.setFullYear(desde.getFullYear() - RETENCION_ANIOS);

  const where = {
    doctorId: getTenantId(user),
    deletedAt: { not: null, gte: desde },
  };

  const total = await prisma.patient.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const pacientes = await prisma.patient.findMany({
    where,
    select: { id: true, nombreYApellido: true, nroDocumento: true, deletedAt: true },
    orderBy: { deletedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Pacientes eliminados</h1>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Por la Ley 26.529 la historia clínica se conserva un mínimo de 10 años: podés
            restaurar cualquier paciente eliminado en ese período.
          </p>
          <EliminadosTable
            pacientes={pacientes.map((p) => ({ ...p, deletedAt: p.deletedAt!.toISOString() }))}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages} ({total} en total)
              </p>
              <div className="flex items-center gap-2">
                {page <= 1 ? (
                  <Button size="sm" variant="outline" disabled>
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/patients/eliminados?page=${page - 1}`} />}
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>
                )}
                {page >= totalPages ? (
                  <Button size="sm" variant="outline" disabled>
                    Siguiente
                    <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={`/patients/eliminados?page=${page + 1}`} />}
                  >
                    Siguiente
                    <ChevronRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
