import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { accesoImportacionSchema, nuevoAccesoHasta } from "@/lib/importacion";

type RouteParams = { params: Promise<{ id: string }> };

// El médico le quita al equipo el permiso de ver los archivos, o se lo
// renueva por otras `IMPORTACION_ACCESO_HORAS`. Sin `escritura`: quitar el
// permiso tiene que funcionar aunque el plan esté vencido.
export async function POST(request: Request, { params }: RouteParams) {
  const { user, response } = await requireDoctor();
  if (response) return response;

  const parsed = accesoImportacionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  const { id } = await params;
  const importacion = await prisma.importacionHC.findFirst({
    where: { id, doctorId: user.id },
    select: { estado: true, archivosBorradosAt: true },
  });
  if (!importacion) {
    return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
  }
  if (importacion.estado !== "ENVIADA" || importacion.archivosBorradosAt) {
    return NextResponse.json({ error: "Esta importación ya no tiene archivos." }, { status: 409 });
  }

  const renovar = parsed.data.accion === "renovar";
  await prisma.$transaction(async (tx) => {
    await tx.importacionHC.update({
      where: { id },
      data: { accesoHasta: renovar ? nuevoAccesoHasta() : null },
    });
    await registrarAuditoria(tx, {
      doctorId: user.id,
      actorId: user.id,
      accion: renovar ? "AUTORIZAR_ACCESO" : "REVOCAR_ACCESO",
      entidad: "IMPORTACION",
      entidadId: id,
    });
  });

  return NextResponse.json({ ok: true });
}
