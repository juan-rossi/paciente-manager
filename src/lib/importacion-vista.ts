import { prisma } from "@/lib/prisma";
import { accesoVigente, archivosVencenEl } from "@/lib/importacion";
import { TIME_ZONE } from "@/lib/timezone";
import type { ImportacionEstado } from "@/generated/prisma/client";

// Las fechas viajan ya formateadas: el componente es cliente y, formateadas
// allá, el texto del SSR (Node, UTC en Vercel) no coincidiría con el del
// navegador al hidratar. Hora de Buenos Aires, 24 h.
const fechaHoraFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});
const fechaFormatter = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: TIME_ZONE });

export type AccesoImportacion = {
  id: string;
  // "22 nov, 14:05"
  fecha: string;
  tipo: "AUTORIZAR_ACCESO" | "REVOCAR_ACCESO" | "DESCARGAR" | "ELIMINAR";
  // Quién: el propio médico o alguien del equipo de Semio 360.
  quien: string;
  esEquipo: boolean;
  archivo: string | null;
};

export type ImportacionVista = {
  id: string;
  estado: Exclude<ImportacionEstado, "BORRADOR">;
  nota: string | null;
  // Textos ya formateados (ver arriba): "22 de noviembre" / "22 nov, 14:05".
  enviadaEl: string;
  accesoHasta: string | null;
  // Calculado en el servidor al armar la página (el render no lee el reloj).
  accesoVigente: boolean;
  archivosVencenEl: string;
  cargadaEl: string | null;
  notaEquipo: string | null;
  archivos: { id: string; nombre: string; tamano: number }[];
  accesos: AccesoImportacion[];
};

const TIPOS_ACCESO = ["AUTORIZAR_ACCESO", "REVOCAR_ACCESO", "DESCARGAR", "ELIMINAR"] as const;

/**
 * Importaciones del médico para Configuración > Mis datos, la más nueva
 * primero, con su registro de accesos (quién abrió cada archivo y cuándo,
 * Acuerdo de tratamiento de datos punto 3). Los borradores no se muestran:
 * son subidas que no llegaron a enviarse.
 */
export async function getImportacionesVista(doctorId: string, limite = 5): Promise<ImportacionVista[]> {
  const importaciones = await prisma.importacionHC.findMany({
    where: { doctorId, estado: { not: "BORRADOR" } },
    orderBy: { createdAt: "desc" },
    take: limite,
    select: {
      id: true,
      estado: true,
      nota: true,
      createdAt: true,
      enviadaAt: true,
      accesoHasta: true,
      cargadaAt: true,
      notaEquipo: true,
      archivos: { orderBy: { createdAt: "asc" }, select: { id: true, nombre: true, tamano: true } },
    },
  });
  if (importaciones.length === 0) return [];

  const archivoAImportacion = new Map<string, { importacionId: string; nombre: string }>();
  for (const imp of importaciones) {
    for (const archivo of imp.archivos) {
      archivoAImportacion.set(archivo.id, { importacionId: imp.id, nombre: archivo.nombre });
    }
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      doctorId,
      entidad: "IMPORTACION",
      accion: { in: [...TIPOS_ACCESO] },
      entidadId: { in: [...importaciones.map((i) => i.id), ...archivoAImportacion.keys()] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      accion: true,
      entidadId: true,
      createdAt: true,
      actorId: true,
      actor: { select: { nombre: true, apellido: true } },
    },
  });

  const accesosPorImportacion = new Map<string, AccesoImportacion[]>();
  for (const log of logs) {
    const archivo = archivoAImportacion.get(log.entidadId);
    const importacionId = archivo?.importacionId ?? log.entidadId;
    const esEquipo = log.actorId !== doctorId;
    const lista = accesosPorImportacion.get(importacionId) ?? [];
    lista.push({
      id: log.id,
      fecha: fechaHoraFormatter.format(log.createdAt),
      tipo: log.accion as AccesoImportacion["tipo"],
      quien: esEquipo ? `${log.actor.nombre} ${log.actor.apellido}`.trim() : "Vos",
      esEquipo,
      archivo: archivo?.nombre ?? null,
    });
    accesosPorImportacion.set(importacionId, lista);
  }

  return importaciones.map((imp) => ({
    id: imp.id,
    estado: imp.estado as ImportacionVista["estado"],
    nota: imp.nota,
    enviadaEl: fechaFormatter.format(imp.enviadaAt ?? imp.createdAt),
    accesoHasta: imp.accesoHasta ? fechaHoraFormatter.format(imp.accesoHasta) : null,
    accesoVigente: accesoVigente(imp.accesoHasta),
    archivosVencenEl: fechaFormatter.format(archivosVencenEl(imp.createdAt)),
    cargadaEl: imp.cargadaAt ? fechaFormatter.format(imp.cargadaAt) : null,
    notaEquipo: imp.notaEquipo,
    archivos: imp.archivos,
    accesos: accesosPorImportacion.get(imp.id) ?? [],
  }));
}
