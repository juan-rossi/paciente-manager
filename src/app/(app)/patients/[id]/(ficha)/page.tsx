import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTenantId } from "@/lib/tenant";
import { esActivo, isPremium } from "@/lib/plan";
import { getResumenAutomatico } from "@/lib/resumen-automatico";
import { PatientSummary } from "@/components/patient-summary";
import { patientFromApi } from "@/components/patient-form/utils";
import { computeTurnoDiffs, type TurnoDiff } from "@/lib/patient-turno-diff";
import { PageEnter } from "@/components/page-transition";
import { tenantEsOdontologo } from "@/lib/odontograma-server";
import { aplicarPracticas, parseDatos } from "@/lib/odontograma";
import { practicaVisitaFromDb } from "@/lib/practica-odontologica";
import type { OdontogramaResumenProps } from "@/components/odontograma/odontograma-resumen";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ turnoId?: string }>;
};

export default async function PatientDetailPage({ params, searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) notFound();
  const tenantId = getTenantId(user);

  const { id } = await params;
  const { turnoId } = await searchParams;

  const patient = await prisma.patient.findFirst({
    where: { id, doctorId: tenantId, deletedAt: null },
    include: {
      antecedentes: true,
      evoluciones: { where: { deletedAt: null }, orderBy: { fecha: "asc" } },
      // Sin filtro de deletedAt a propósito: el manager de consentimientos
      // muestra también los eliminados (en una sección aparte) para poder
      // restaurarlos, igual que la pestaña de evolución en el formulario.
      consentimientos: { orderBy: { fecha: "desc" } },
    },
  });

  if (!patient) {
    notFound();
  }

  // Alimenta "últimos pacientes vistos" de la búsqueda. Si falla no debe
  // romper la ficha: es solo una comodidad de navegación.
  await prisma.pacienteVisto
    .upsert({
      where: { userId_patientId: { userId: user.id, patientId: id } },
      create: { userId: user.id, patientId: id },
      update: { vistoAt: new Date() },
    })
    .catch((error) => console.error("No se pudo registrar el paciente visto", error));

  // Para el historial de auditoría hace falta buscar TODAS las evoluciones y
  // consentimientos que alguna vez tuvo este paciente (incluidos los
  // eliminados), no solo los activos -- si no, un registro borrado
  // desaparecería también de su propio historial de auditoría.
  const evolucionIds = (
    await prisma.patientEvolucion.findMany({ where: { patientId: id }, select: { id: true } })
  ).map((e) => e.id);
  const consentimientoIds = (
    await prisma.consentimientoInformado.findMany({ where: { patientId: id }, select: { id: true } })
  ).map((c) => c.id);
  const odontogramaIds = (
    await prisma.patientOdontograma.findMany({ where: { patientId: id }, select: { id: true } })
  ).map((o) => o.id);
  const practicaIds =
    odontogramaIds.length > 0
      ? (
          await prisma.odontogramaPractica.findMany({
            where: { odontogramaId: { in: odontogramaIds } },
            select: { id: true },
          })
        ).map((p) => p.id)
      : [];

  const auditEntries = await prisma.auditLog.findMany({
    where: {
      doctorId: tenantId,
      OR: [
        { entidad: "PACIENTE", entidadId: id },
        ...(evolucionIds.length > 0
          ? [{ entidad: "EVOLUCION" as const, entidadId: { in: evolucionIds } }]
          : []),
        ...(consentimientoIds.length > 0
          ? [{ entidad: "CONSENTIMIENTO" as const, entidadId: { in: consentimientoIds } }]
          : []),
        ...(odontogramaIds.length > 0
          ? [{ entidad: "ODONTOGRAMA" as const, entidadId: { in: odontogramaIds } }]
          : []),
        ...(practicaIds.length > 0
          ? [{ entidad: "PRACTICA_ODONTOLOGICA" as const, entidadId: { in: practicaIds } }]
          : []),
      ],
    },
    include: { actor: { select: { nombre: true, apellido: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let diffs: TurnoDiff[] = [];
  if (turnoId) {
    const turno = await prisma.turno.findFirst({
      where: { id: turnoId, doctorId: tenantId },
      select: { nombreYApellido: true, dni: true, telefono: true, obraSocial: true },
    });
    if (turno) {
      diffs = computeTurnoDiffs(patient, turno);
    }
  }

  const { values: patientValues } = patientFromApi(patient);
  const resumenAutomatico = await getResumenAutomatico(user);
  const esOdontologo = await tenantEsOdontologo(tenantId);

  // Odontólogos: la ficha muestra la última visita del odontograma. Mismo
  // orden que la pestaña de edición (el inicial primero, después por fecha).
  let odontograma: OdontogramaResumenProps | null = null;
  if (esOdontologo) {
    const visitas = (
      await prisma.patientOdontograma.findMany({
        where: { patientId: id, deletedAt: null },
        orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
        include: { practicas: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } } },
      })
    ).sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "INICIAL" ? -1 : 1));
    const ultima = visitas.at(-1);
    const anterior = visitas.at(-2);
    odontograma = {
      patientId: id,
      totalVisitas: visitas.length,
      historial: visitas
        .map((v) => ({
          id: v.id,
          tipo: v.tipo,
          fecha: v.fecha.toISOString().slice(0, 10),
          nota: v.nota ?? "",
          practicas: v.practicas.map(practicaVisitaFromDb),
        }))
        .reverse(),
      ultima: ultima
        ? {
            tipo: ultima.tipo,
            fecha: ultima.fecha.toISOString().slice(0, 10),
            nota: ultima.nota ?? "",
            datos: parseDatos(ultima.datos),
            practicas: ultima.practicas.map(practicaVisitaFromDb),
          }
        : null,
      anterior: anterior
        ? {
            datos: aplicarPracticas(
              parseDatos(anterior.datos),
              anterior.practicas.map(practicaVisitaFromDb),
              "existente"
            ),
          }
        : null,
    };
  }

  return (
    <PageEnter>
      <PatientSummary
        patient={patient}
        diffs={diffs}
        patientValues={patientValues}
        auditEntries={auditEntries}
        transcripcionHabilitada={isPremium(user) && esActivo(user)}
        resumirEvolucionesAlTerminar={resumenAutomatico.evoluciones}
        evolucionHabilitada={!esOdontologo}
        odontograma={odontograma}
      />
    </PageEnter>
  );
}
