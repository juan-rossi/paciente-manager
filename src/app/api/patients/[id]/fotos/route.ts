import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { registrarAuditoria } from "@/lib/audit-log";
import {
  BYTES_MAXIMOS_FOTO,
  fotoFromDb,
  fotoInput,
  normalizarFotoClinica,
  SELECT_FOTO_SIN_DATOS,
} from "@/lib/foto-clinica";

type RouteParams = { params: Promise<{ id: string }> };

// Fotos clínicas. Son historia clínica: solo el médico (requireDoctor),
// nunca el asistente.
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, tenantId, response } = await requireDoctor({ escritura: true });
  if (response) return response;

  const { id } = await params;
  const owned = await prisma.patient.findFirst({
    where: { id, doctorId: tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Paciente no encontrado." }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  const archivo = form?.get("foto");
  if (!(archivo instanceof Blob) || archivo.size === 0) {
    return NextResponse.json({ error: "No se recibió la foto." }, { status: 400 });
  }
  if (archivo.size > BYTES_MAXIMOS_FOTO) {
    return NextResponse.json({ error: "La foto es demasiado grande." }, { status: 413 });
  }

  const parsed = fotoInput.safeParse({
    evolucionId: form?.get("evolucionId") ?? "",
    fecha: form?.get("fecha") ?? "",
    zona: form?.get("zona") ?? "",
    nota: form?.get("nota") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  // Con evolución: tiene que ser de este paciente y estar vigente, y la foto
  // toma su fecha. Sin evolución: es de la consulta inicial, con su fecha.
  let fecha: Date;
  if (parsed.data.evolucionId) {
    const evolucion = await prisma.patientEvolucion.findFirst({
      where: { id: parsed.data.evolucionId, patientId: id, deletedAt: null },
      select: { fecha: true },
    });
    if (!evolucion) {
      return NextResponse.json({ error: "Evolución no encontrada." }, { status: 404 });
    }
    fecha = evolucion.fecha;
  } else {
    fecha = new Date(parsed.data.fecha!);
  }

  const foto = await normalizarFotoClinica(Buffer.from(await archivo.arrayBuffer()));
  if (!foto) {
    return NextResponse.json({ error: "El archivo no es una imagen válida (JPG, PNG o WebP)." }, { status: 400 });
  }

  const creada = await prisma.patientFoto.create({
    data: {
      patientId: id,
      evolucionId: parsed.data.evolucionId ?? null,
      fecha,
      zona: parsed.data.zona,
      nota: parsed.data.nota ?? null,
      datos: new Uint8Array(foto.datos),
      miniatura: new Uint8Array(foto.miniatura),
      ancho: foto.ancho,
      alto: foto.alto,
    },
    select: SELECT_FOTO_SIN_DATOS,
  });

  await registrarAuditoria(prisma, {
    doctorId: tenantId,
    actorId: user.id,
    accion: "CREAR",
    entidad: "FOTO",
    entidadId: creada.id,
  });

  return NextResponse.json({ foto: fotoFromDb(creada) }, { status: 201 });
}
