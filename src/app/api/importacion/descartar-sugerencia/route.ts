import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/api-auth";

// El médico cierra el acceso rápido "Importá tus historias clínicas" del
// dashboard (lo ve si marcó en el registro que quería importar). Solo oculta
// la sugerencia: puede importar igual desde Configuración > Mis datos, y en
// /admin/importaciones el equipo lo sigue viendo, marcado como descartado.
// Sin `escritura`: es una preferencia de UI, no un dato clínico.
export async function POST() {
  const { user, response } = await requireDoctor();
  if (response) return response;

  await prisma.user.update({
    where: { id: user.id },
    data: { importacionDescartadaAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
