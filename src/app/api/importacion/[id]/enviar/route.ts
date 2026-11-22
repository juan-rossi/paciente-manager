import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { nuevoAccesoHasta } from "@/lib/importacion";

type RouteParams = { params: Promise<{ id: string }> };

// Envía la importación al equipo: desde ahora puede descargar los archivos
// durante `IMPORTACION_ACCESO_HORAS` (el permiso que da el médico al subirlos).
export async function POST(_request: Request, { params }: RouteParams) {
  const { user, response } = await requireDoctor({ escritura: true });
  if (response) return response;

  const { id } = await params;
  const importacion = await prisma.importacionHC.findFirst({
    where: { id, doctorId: user.id },
    select: { estado: true, _count: { select: { archivos: true } } },
  });
  if (!importacion) {
    return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
  }
  if (importacion.estado !== "BORRADOR") {
    return NextResponse.json({ error: "Esta importación ya fue enviada." }, { status: 409 });
  }
  if (importacion._count.archivos === 0) {
    return NextResponse.json({ error: "Subí al menos un archivo." }, { status: 400 });
  }

  const ahora = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.importacionHC.update({
      where: { id },
      data: { estado: "ENVIADA", enviadaAt: ahora, accesoHasta: nuevoAccesoHasta(ahora) },
    });
    await registrarAuditoria(tx, {
      doctorId: user.id,
      actorId: user.id,
      accion: "AUTORIZAR_ACCESO",
      entidad: "IMPORTACION",
      entidadId: id,
    });
  });

  return NextResponse.json({ ok: true });
}
