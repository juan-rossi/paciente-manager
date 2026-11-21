import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";

type RouteParams = { params: Promise<{ id: string; fotoId: string }> };

// La imagen de una foto clínica (`?tam=mini` para la miniatura). Solo el
// médico dueño del paciente; nunca se cachea en un proxy compartido.
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { tenantId, response } = await requireDoctor();
  if (response) return response;

  const { id, fotoId } = await params;
  const mini = request.nextUrl.searchParams.get("tam") === "mini";
  const foto = await prisma.patientFoto.findFirst({
    where: { id: fotoId, patientId: id, deletedAt: null, patient: { doctorId: tenantId, deletedAt: null } },
    select: { miniatura: mini, datos: !mini },
  });
  if (!foto) return new Response(null, { status: 404 });

  const bytes = mini ? foto.miniatura : foto.datos;
  if (!bytes) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      // Siempre JPEG: se re-codifica al subirla (ver normalizarFotoClinica()).
      "Content-Type": "image/jpeg",
      // Una foto no cambia nunca (solo se puede eliminar): se puede cachear en
      // el navegador del médico, pero no en proxies ni CDN.
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor({ escritura: true });
  if (response) return response;

  const { id, fotoId } = await params;
  // Ley 26.529 art. 12/18: como el resto de la historia clínica, una foto
  // nunca se borra físicamente, solo se oculta.
  const result = await prisma.patientFoto.updateMany({
    where: { id: fotoId, patientId: id, deletedAt: null, patient: { doctorId: tenantId, deletedAt: null } },
    data: { deletedAt: new Date() },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
  }

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "ELIMINAR",
    entidad: "FOTO",
    entidadId: fotoId,
  });

  return NextResponse.json({ ok: true });
}
