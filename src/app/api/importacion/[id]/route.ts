import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { borrarArchivosImportacion } from "@/lib/datos-server";

type RouteParams = { params: Promise<{ id: string }> };

// Cancela una importación que todavía no se cargó: borra los archivos en el
// momento. Un borrador (subida cortada o abandonada) se elimina entero.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const { id } = await params;
  const importacion = await prisma.importacionHC.findFirst({
    where: { id, doctorId: user.id },
    select: { estado: true },
  });
  if (!importacion) {
    return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
  }

  if (importacion.estado === "BORRADOR") {
    await prisma.importacionHC.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }
  if (importacion.estado !== "ENVIADA") {
    return NextResponse.json({ error: "Esta importación ya no se puede cancelar." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await borrarArchivosImportacion(tx, id, { estado: "CANCELADA" });
    await registrarAuditoria(tx, {
      doctorId: user.id,
      actorId: user.id,
      accion: "ELIMINAR",
      entidad: "IMPORTACION",
      entidadId: id,
    });
  });
  return NextResponse.json({ ok: true });
}
