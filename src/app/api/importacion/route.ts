import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";
import { ACUERDO_DATOS_VERSION } from "@/lib/acuerdo-datos";
import { crearImportacionSchema, ESTADOS_IMPORTACION_ABIERTOS } from "@/lib/importacion";
import { getClientIp } from "@/lib/request-ip";

// Arranca una importación de HC (en borrador): registra la aceptación del
// Acuerdo de tratamiento de datos y la declaración sobre el origen de los
// datos. Los archivos se suben después, de a uno (ver ./[id]/archivos), y
// recién al enviarla el equipo puede verlos. Solo el médico: es HC.
export async function POST(request: NextRequest) {
  const { user, response } = await requireDoctor({ escritura: true });
  if (response) return response;

  const parsed = crearImportacionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }

  // Un borrador que quedó colgado (se cortó la subida) se descarta: se
  // reemplaza por el nuevo. Una enviada o cargada sí bloquea.
  const abierta = await prisma.importacionHC.findFirst({
    where: { doctorId: user.id, estado: { in: [...ESTADOS_IMPORTACION_ABIERTOS] } },
    select: { id: true, estado: true },
  });
  if (abierta && abierta.estado !== "BORRADOR") {
    return NextResponse.json(
      { error: "Ya tenés una importación en curso. Esperá a que termine para empezar otra." },
      { status: 409 }
    );
  }

  const ahora = new Date();
  const creada = await prisma.$transaction(async (tx) => {
    if (abierta) await tx.importacionHC.delete({ where: { id: abierta.id } });
    await tx.user.update({
      where: { id: user.id },
      data: { acuerdoDatosVersion: ACUERDO_DATOS_VERSION, acuerdoDatosAceptadoAt: ahora },
    });
    return tx.importacionHC.create({
      data: {
        doctorId: user.id,
        nota: parsed.data.nota || null,
        acuerdoVersion: ACUERDO_DATOS_VERSION,
        aceptadoAt: ahora,
        aceptadoIp: getClientIp(request),
      },
      select: { id: true },
    });
  });

  return NextResponse.json({ id: creada.id }, { status: 201 });
}
