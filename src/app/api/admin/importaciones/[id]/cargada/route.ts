import { after, NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import { cargadaImportacionSchema } from "@/lib/importacion";
import { borrarArchivosImportacion } from "@/lib/datos-server";
import { avisarImportacionCargada } from "@/lib/email-datos";
import { getSiteUrl } from "@/lib/site-url";

type RouteParams = { params: Promise<{ id: string }> };

// El equipo terminó de cargar la importación: se borran los archivos en el
// momento y se le avisa al médico para que revise y confirme.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const parsed = cargadaImportacionSchema.safeParse(await request.json().catch(() => ({})));
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

  const notaEquipo = parsed.data.notaEquipo || null;
  await prisma.$transaction(async (tx) => {
    await borrarArchivosImportacion(tx, id, { estado: "CARGADA", cargadaAt: new Date(), notaEquipo });
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
    avisarImportacionCargada(importacion.doctor.email, {
      nombre: importacion.doctor.nombre,
      notaEquipo,
      baseUrl,
    })
  );

  return NextResponse.json({ ok: true });
}
