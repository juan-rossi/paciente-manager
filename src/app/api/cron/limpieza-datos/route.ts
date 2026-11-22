import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { IMPORTACION_DIAS_ARCHIVOS } from "@/lib/importacion";
import { BAJA_DIAS_PARA_DESCARGAR } from "@/lib/baja-cuenta";
import { borrarArchivosImportacion, eliminarCuenta } from "@/lib/datos-server";

// Borrar la cuenta de un médico grande puede tardar.
export const maxDuration = 300;

const DIA_MS = 24 * 60 * 60 * 1000;

// Cron diario (ver `crons` en vercel.json) que cumple los plazos del Acuerdo
// de tratamiento de datos:
// - Punto 3: los archivos de importación se borran a los
//   `IMPORTACION_DIAS_ARCHIVOS` días aunque el equipo no haya terminado.
// - Punto 6: las cuentas dadas de baja se borran a los
//   `BAJA_DIAS_PARA_DESCARGAR` días.
// Vercel llama con `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/limpieza-datos] Falta CRON_SECRET");
    return NextResponse.json({ error: "Cron sin configurar." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const ahora = Date.now();

  const vencidas = await prisma.importacionHC.findMany({
    where: {
      estado: { in: ["BORRADOR", "ENVIADA"] },
      createdAt: { lt: new Date(ahora - IMPORTACION_DIAS_ARCHIVOS * DIA_MS) },
    },
    select: { id: true, estado: true },
  });
  for (const { id, estado } of vencidas) {
    if (estado === "BORRADOR") {
      await prisma.importacionHC.delete({ where: { id } });
    } else {
      await borrarArchivosImportacion(prisma, id, { estado: "VENCIDA" });
    }
  }

  const bajas = await prisma.user.findMany({
    where: {
      role: "DOCTOR",
      eliminadaAt: null,
      bajaAt: { lt: new Date(ahora - BAJA_DIAS_PARA_DESCARGAR * DIA_MS) },
    },
    select: { id: true },
    // Acotado por corrida: si quedan más, siguen al día siguiente.
    take: 20,
  });
  const eliminadas: string[] = [];
  for (const { id } of bajas) {
    try {
      await eliminarCuenta(id);
      eliminadas.push(id);
    } catch (error) {
      console.error(`[cron/limpieza-datos] no se pudo eliminar la cuenta ${id}`, error);
    }
  }

  return NextResponse.json({ importacionesVencidas: vencidas.length, cuentasEliminadas: eliminadas.length });
}
