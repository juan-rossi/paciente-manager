import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import {
  extensionPermitida,
  IMPORTACION_ARCHIVOS_MAXIMOS,
  IMPORTACION_BYTES_MAXIMOS_ARCHIVO,
  IMPORTACION_EXTENSIONES,
  normalizarNombreArchivo,
} from "@/lib/importacion";

type RouteParams = { params: Promise<{ id: string }> };

// Sube UN archivo a una importación en borrador (un request por archivo, por
// el límite de body de Vercel). Solo el médico dueño.
export async function POST(request: NextRequest, { params }: RouteParams) {
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
  if (importacion._count.archivos >= IMPORTACION_ARCHIVOS_MAXIMOS) {
    return NextResponse.json(
      { error: `Podés enviar hasta ${IMPORTACION_ARCHIVOS_MAXIMOS} archivos por importación.` },
      { status: 400 }
    );
  }

  const form = await request.formData().catch(() => null);
  const archivo = form?.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "No se recibió el archivo." }, { status: 400 });
  }
  const nombre = normalizarNombreArchivo(archivo.name);
  if (!extensionPermitida(nombre)) {
    return NextResponse.json(
      { error: `"${nombre}" no es un formato que podamos importar (${IMPORTACION_EXTENSIONES.join(", ")}).` },
      { status: 400 }
    );
  }
  if (archivo.size > IMPORTACION_BYTES_MAXIMOS_ARCHIVO) {
    return NextResponse.json(
      { error: `"${nombre}" pesa más de 4 MB. Dividilo en partes o comprimilo en un .zip.` },
      { status: 413 }
    );
  }

  const creado = await prisma.importacionArchivo.create({
    data: {
      importacionId: id,
      nombre,
      tipo: archivo.type || "application/octet-stream",
      tamano: archivo.size,
      datos: new Uint8Array(await archivo.arrayBuffer()),
    },
    select: { id: true },
  });

  return NextResponse.json({ id: creado.id }, { status: 201 });
}
