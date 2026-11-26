import { prisma } from "@/lib/prisma";
import { asegurarLinkCodigos, linkPaciente } from "@/lib/turno-link-paciente";
import type { LinksTeleconsulta } from "@/lib/recordatorio-mensaje";

export type MotivoAvisoPendiente = "CANCELADO" | "APLAZADO" | "PASADO_A_TELECONSULTA" | "PASADO_A_PRESENCIAL";

export type TurnoPendienteAviso = {
  id: string;
  nombreYApellido: string;
  telefono: string;
  inicio: string;
  avisoPendienteMotivo: MotivoAvisoPendiente;
  avisoPendienteFechaAnterior: string | null;
  // Solo para PASADO_A_TELECONSULTA: los links del paciente (sala,
  // confirmar y cancelar).
  linksTeleconsulta: LinksTeleconsulta | null;
  // Solo para PASADO_A_PRESENCIAL: dónde lo atienden ("Av. X 123, Ciudad").
  dondeAtiende: string | null;
};

// A diferencia de `getRecordatoriosDelDia`, esto NO está atado a un día
// puntual -- son los turnos que la resolución de conflictos de "Bloquear
// horarios" canceló/movió, o a los que se les cambió la modalidad
// (presencial <-> teleconsulta), y todavía nadie marcó como notificados,
// sin importar la fecha (vieja o nueva) en la que hayan quedado. Mismo
// criterio de scoping por lugar que el resto de la app (`lugarId === null`
// = sin lugar asignado, no ve nada).
export async function getTurnosPendientesDeAviso(
  tenantId: string,
  lugarId?: string | null
): Promise<TurnoPendienteAviso[]> {
  if (lugarId === null) return [];

  const turnos = await prisma.turno.findMany({
    where: {
      doctorId: tenantId,
      avisoPendiente: true,
      ...(lugarId ? { lugarId } : {}),
    },
    orderBy: { inicio: "asc" },
    select: {
      id: true,
      nombreYApellido: true,
      telefono: true,
      inicio: true,
      avisoPendienteMotivo: true,
      avisoPendienteFechaAnterior: true,
      linkCodigo: true,
      lugar: { select: { nombre: true, direccion: true, ciudad: true } },
    },
  });

  const codigos = await asegurarLinkCodigos(
    turnos.filter((t) => t.avisoPendienteMotivo === "PASADO_A_TELECONSULTA")
  );

  return turnos.map((t) => {
    const codigo = codigos.get(t.id);
    const direccion = t.lugar.direccion?.trim();
    return {
      id: t.id,
      nombreYApellido: t.nombreYApellido,
      telefono: t.telefono,
      inicio: t.inicio.toISOString(),
      avisoPendienteMotivo: t.avisoPendienteMotivo as MotivoAvisoPendiente,
      avisoPendienteFechaAnterior: t.avisoPendienteFechaAnterior?.toISOString() ?? null,
      linksTeleconsulta: codigo
        ? {
            sala: linkPaciente(codigo, "sala"),
            confirmar: linkPaciente(codigo, "si"),
            cancelar: linkPaciente(codigo, "no"),
          }
        : null,
      dondeAtiende:
        t.avisoPendienteMotivo === "PASADO_A_PRESENCIAL"
          ? (direccion
              ? [direccion, t.lugar.ciudad?.trim()].filter(Boolean).join(", ")
              : t.lugar.nombre?.trim() || null)
          : null,
    };
  });
}
