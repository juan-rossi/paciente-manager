import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { accesoVigente } from "@/lib/importacion";

type RouteParams = { params: Promise<{ id: string; archivoId: string }> };

// Descarga de un archivo de importación por el equipo. Solo mientras el
// médico tenga el permiso vigente (Acuerdo de tratamiento de datos, punto 3),
// y cada descarga queda en el AuditLog de su cuenta: el médico ve quién abrió
// cada archivo y cuándo. Siempre como adjunto, nunca renderizado en el
// navegador.
export async function GET(_request: Request, { params }: RouteParams) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { id, archivoId } = await params;
  const archivo = await prisma.importacionArchivo.findFirst({
    where: { id: archivoId, importacionId: id },
    select: {
      nombre: true,
      datos: true,
      importacion: { select: { doctorId: true, estado: true, accesoHasta: true } },
    },
  });
  if (!archivo) {
    return NextResponse.json({ error: "Archivo no encontrado." }, { status: 404 });
  }
  const { importacion } = archivo;
  if (importacion.estado === "BORRADOR") {
    return NextResponse.json({ error: "El médico todavía no envió esta importación." }, { status: 409 });
  }
  if (importacion.estado !== "ENVIADA" || !archivo.datos) {
    return NextResponse.json({ error: "El archivo ya fue borrado." }, { status: 410 });
  }
  if (!accesoVigente(importacion.accesoHasta)) {
    return NextResponse.json(
      { error: "El médico no dio permiso o el permiso venció. Pedile que lo renueve." },
      { status: 403 }
    );
  }

  await registrarAuditoria(prisma, {
    doctorId: importacion.doctorId,
    actorId: user.id,
    accion: "DESCARGAR",
    entidad: "IMPORTACION",
    entidadId: archivoId,
  });

  return new NextResponse(Buffer.from(archivo.datos), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
