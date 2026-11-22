import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { rechazarImportacionSchema } from "@/lib/importacion";
import { borrarArchivosImportacion } from "@/lib/datos-server";
import { avisarImportacionRechazada } from "@/lib/email-datos";
import { getSiteUrl } from "@/lib/site-url";

type RouteParams = { params: Promise<{ id: string }> };

// El equipo no pudo cargar la importación con los archivos recibidos
// (ilegibles, incompletos, protegidos, formato que no se puede leer): se
// borran en el momento y se le avisa al médico el motivo para que mande otros.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const parsed = rechazarImportacionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  const { id } = await params;
  const importacion = await prisma.importacionHC.findUnique({
    where: { id },
    select: { estado: true, doctorId: true, doctor: { select: { email: true, nombre: true } } },
  });
  if (!importacion) {
    return NextResponse.json({ error: "Importación no encontrada." }, { status: 404 });
  }
  if (importacion.estado !== "ENVIADA") {
    return NextResponse.json({ error: "Esta importación no está esperando carga." }, { status: 409 });
  }

  const { motivo } = parsed.data;
  await prisma.$transaction(async (tx) => {
    await borrarArchivosImportacion(tx, id, { estado: "RECHAZADA", rechazadaAt: new Date(), notaEquipo: motivo });
    await registrarAuditoria(tx, {
      doctorId: importacion.doctorId,
      actorId: user.id,
      accion: "ELIMINAR",
      entidad: "IMPORTACION",
      entidadId: id,
    });
  });

  const baseUrl = process.env.NODE_ENV === "production" ? getSiteUrl() : request.nextUrl.origin;
  after(() =>
    avisarImportacionRechazada(importacion.doctor.email, {
      nombre: importacion.doctor.nombre,
      motivo,
      baseUrl,
    })
  );

  return NextResponse.json({ ok: true });
}
