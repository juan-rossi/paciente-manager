import { prisma } from "@/lib/prisma";
import {
  esActivo,
  fechaVencimientoRelevante,
  diasParaFecha,
  precioMensualEquivalente,
  PLAN_DURACION_LABEL,
  type PlanDuracion,
} from "@/lib/plan";
import { TIME_ZONE } from "@/lib/timezone";

/**
 * Capa de datos del panel owner/admin (`/admin`) -- consultas cross-tenant
 * sobre todos los `DOCTOR` de la plataforma. Nunca pasa por `getTenantId()`
 * (ver `src/lib/tenant.ts`): un ADMIN no tiene un tenant propio, necesita
 * ver a todos.
 *
 * El volumen de médicos hoy es chico (fase inicial de comercialización), así
 * que se trae todo con Prisma y se filtra/ordena/agrupa en JS -- más simple
 * de leer y de ajustar mientras el criterio de "activo", los filtros, etc.
 * todavía se están afinando. Si la cantidad de médicos crece mucho, migrar
 * los filtros/agregaciones a la base (where/groupBy) en vez de en memoria.
 */

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const MESES_POR_DURACION: Record<PlanDuracion, number> = {
  MENSUAL: 1,
  SEMESTRAL: 6,
  ANUAL: 12,
  MESES_18: 18,
  BIANUAL: 24,
};

const DOCTOR_LIST_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  nroMatricula: true,
  createdAt: true,
  plan: true,
  trialEndsAt: true,
  planDuracion: true,
  planEndsAt: true,
  _count: {
    select: {
      pacientes: { where: { deletedAt: null } },
      turnosDelDoctor: true,
      doctorAsignaciones: true,
    },
  },
} as const;

type DoctorListRow = Awaited<ReturnType<typeof fetchDoctoresBase>>[number];

function fetchDoctoresBase() {
  return prisma.user.findMany({
    where: { role: "DOCTOR" },
    select: DOCTOR_LIST_SELECT,
    orderBy: { createdAt: "desc" },
  });
}

export type EstadoMedico = "ACTIVO" | "INACTIVO";

export type MedicoResumen = {
  id: string;
  nombreCompleto: string;
  email: string;
  nroMatricula: string;
  createdAt: Date;
  estado: EstadoMedico;
  tier: "BASICA" | "PREMIUM";
  esTrial: boolean;
  planLabel: string; // "Trial", "Trial vencido", "Básico · 6 meses", ...
  vencimiento: Date | null;
  diasParaVencer: number | null; // negativo = ya venció
  pacientesCount: number;
  turnosCount: number;
  secretariasCount: number;
};

function planLabelDe(doctor: Pick<DoctorListRow, "plan" | "planDuracion" | "planEndsAt" | "trialEndsAt">) {
  if (doctor.planEndsAt && doctor.planDuracion) {
    const tier = doctor.plan === "PREMIUM" ? "Premium" : "Básico";
    return { label: `${tier} · ${PLAN_DURACION_LABEL[doctor.planDuracion]}`, esTrial: false };
  }
  const trialVencido = doctor.trialEndsAt ? doctor.trialEndsAt.getTime() <= Date.now() : false;
  return { label: trialVencido ? "Trial vencido" : "Trial", esTrial: true };
}

function resumenDe(doctor: DoctorListRow): MedicoResumen {
  const activo = esActivo(doctor);
  const vencimiento = fechaVencimientoRelevante(doctor);
  const { label, esTrial } = planLabelDe(doctor);
  return {
    id: doctor.id,
    nombreCompleto: `${doctor.nombre} ${doctor.apellido}`.trim(),
    email: doctor.email,
    nroMatricula: doctor.nroMatricula,
    createdAt: doctor.createdAt,
    estado: activo ? "ACTIVO" : "INACTIVO",
    tier: doctor.plan,
    esTrial,
    planLabel: label,
    vencimiento,
    diasParaVencer: diasParaFecha(vencimiento),
    pacientesCount: doctor._count.pacientes,
    turnosCount: doctor._count.turnosDelDoctor,
    secretariasCount: doctor._count.doctorAsignaciones,
  };
}

function bucketsUltimosMeses(cantidad: number): { year: number; month: number; label: string }[] {
  const ahora = new Date();
  const buckets: { year: number; month: number; label: string }[] = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - i, 1));
    buckets.push({ year: d.getUTCFullYear(), month: d.getUTCMonth(), label: MESES_CORTOS[d.getUTCMonth()] });
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type DashboardData = {
  totalMedicos: number;
  activos: number;
  inactivos: number;
  porVencerEn7Dias: MedicoResumen[];
  conversion: {
    convirtieron: number;
    vencieronSinConvertir: number;
    enTrialActualmente: number;
    porcentaje: number | null;
  };
  mrrEstimado: number;
  medicosEnPlanPago: number;
  altasPorMes: { mes: string; cantidad: number }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const doctoresRaw = await fetchDoctoresBase();
  const doctores = doctoresRaw.map(resumenDe);

  const activos = doctores.filter((d) => d.estado === "ACTIVO").length;
  const inactivos = doctores.length - activos;

  const porVencerEn7Dias = doctores
    .filter((d) => d.estado === "ACTIVO" && d.diasParaVencer !== null && d.diasParaVencer <= 7)
    .sort((a, b) => (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0));

  const convirtieron = doctores.filter((d) => !d.esTrial).length;
  const vencieronSinConvertir = doctores.filter((d) => d.esTrial && d.estado === "INACTIVO").length;
  const enTrialActualmente = doctores.filter((d) => d.esTrial && d.estado === "ACTIVO").length;
  const trialsFinalizados = convirtieron + vencieronSinConvertir;
  const porcentaje = trialsFinalizados > 0 ? Math.round((convirtieron / trialsFinalizados) * 100) : null;

  const pagosActivos = doctoresRaw.filter((d) => d.planEndsAt && d.planDuracion && esActivo(d));
  const mrrEstimado = pagosActivos.reduce(
    (sum, d) => sum + precioMensualEquivalente(d.plan, d.planDuracion as PlanDuracion),
    0
  );

  const buckets = bucketsUltimosMeses(6);
  const altasPorMes = buckets.map(({ year, month, label }) => ({
    mes: label,
    cantidad: doctoresRaw.filter(
      (d) => d.createdAt.getUTCFullYear() === year && d.createdAt.getUTCMonth() === month
    ).length,
  }));

  return {
    totalMedicos: doctores.length,
    activos,
    inactivos,
    porVencerEn7Dias,
    conversion: { convirtieron, vencieronSinConvertir, enTrialActualmente, porcentaje },
    mrrEstimado,
    medicosEnPlanPago: pagosActivos.length,
    altasPorMes,
  };
}

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------

export type MedicosFiltros = {
  q?: string;
  estado?: "ACTIVO" | "INACTIVO";
  plan?: "TRIAL" | "BASICA" | "PREMIUM";
  vencimiento?: "7" | "30" | "VENCIDO";
};

export async function getMedicos(filtros: MedicosFiltros = {}): Promise<MedicoResumen[]> {
  const doctores = (await fetchDoctoresBase()).map(resumenDe);
  const needle = filtros.q?.trim().toLowerCase();

  return doctores
    .filter((d) => {
      if (filtros.estado && d.estado !== filtros.estado) return false;
      if (filtros.plan === "TRIAL" && !d.esTrial) return false;
      if (filtros.plan === "BASICA" && (d.esTrial || d.tier !== "BASICA")) return false;
      if (filtros.plan === "PREMIUM" && (d.esTrial || d.tier !== "PREMIUM")) return false;
      if (filtros.vencimiento === "VENCIDO" && !(d.diasParaVencer !== null && d.diasParaVencer < 0)) return false;
      if (
        filtros.vencimiento === "7" &&
        !(d.diasParaVencer !== null && d.diasParaVencer >= 0 && d.diasParaVencer <= 7)
      )
        return false;
      if (
        filtros.vencimiento === "30" &&
        !(d.diasParaVencer !== null && d.diasParaVencer >= 0 && d.diasParaVencer <= 30)
      )
        return false;
      if (needle) {
        return d.nombreCompleto.toLowerCase().includes(needle) || d.email.toLowerCase().includes(needle);
      }
      return true;
    })
    .sort((a, b) => {
      const aUrgente = a.estado === "ACTIVO" && a.diasParaVencer !== null && a.diasParaVencer <= 7;
      const bUrgente = b.estado === "ACTIVO" && b.diasParaVencer !== null && b.diasParaVencer <= 7;
      if (aUrgente !== bUrgente) return aUrgente ? -1 : 1;
      if (aUrgente && bUrgente) return (a.diasParaVencer ?? 0) - (b.diasParaVencer ?? 0);
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------

export type MedicoDetalle = MedicoResumen & {
  // Derivada de la última ficha de paciente o turno cargado -- no hay
  // tracking de login/sesión en el schema todavía, así que "actividad" es
  // lo más honesto que se puede mostrar con los datos disponibles.
  ultimaActividad: Date | null;
  historial: { fecha: Date | null; titulo: string; descripcion: string; estimado?: boolean }[];
  usoMensual: { mes: string; pacientes: number }[];
  secretarias: string[];
};

export async function getMedicoDetalle(id: string): Promise<MedicoDetalle | null> {
  const doctor = await prisma.user.findFirst({
    where: { id, role: "DOCTOR" },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      email: true,
      nroMatricula: true,
      createdAt: true,
      plan: true,
      trialEndsAt: true,
      planDuracion: true,
      planEndsAt: true,
      doctorAsignaciones: {
        select: { secretaria: { select: { nombre: true, apellido: true } } },
      },
      pacientes: {
        where: { deletedAt: null },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!doctor) return null;

  const [turnosCount, ultimoTurno] = await Promise.all([
    prisma.turno.count({ where: { doctorId: id } }),
    prisma.turno.findFirst({ where: { doctorId: id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);

  const resumen = resumenDe({
    ...doctor,
    _count: {
      pacientes: doctor.pacientes.length,
      turnosDelDoctor: turnosCount,
      doctorAsignaciones: doctor.doctorAsignaciones.length,
    },
  });

  const historial: MedicoDetalle["historial"] = [
    {
      fecha: doctor.createdAt,
      titulo: "Registro autogestionado",
      descripcion: doctor.trialEndsAt
        ? "Inicio de período de prueba (60 días) — plan Trial."
        : "Alta de la cuenta.",
    },
  ];

  if (doctor.planEndsAt && doctor.planDuracion) {
    const inicioAprox = restarMeses(doctor.planEndsAt, MESES_POR_DURACION[doctor.planDuracion]);
    const tier = doctor.plan === "PREMIUM" ? "Premium" : "Básico";
    historial.push({
      fecha: inicioAprox,
      titulo: "Contratación de plan pago",
      descripcion: `Suscripción ${tier} · ${PLAN_DURACION_LABEL[doctor.planDuracion]}.`,
      estimado: true, // no guardamos la fecha real de conversión -- se infiere de planEndsAt - duración
    });
  }

  if (resumen.estado === "ACTIVO" && resumen.diasParaVencer !== null && resumen.diasParaVencer <= 7) {
    historial.push({
      fecha: null,
      titulo: "Próximo a vencer",
      descripcion: resumen.esTrial
        ? "Trial próximo a vencer, sin conversión a plan pago registrada todavía."
        : "La suscripción actual está por vencer.",
    });
  } else if (resumen.estado === "INACTIVO") {
    historial.push({
      fecha: null,
      titulo: "Cuenta inactiva",
      descripcion: resumen.esTrial
        ? "El trial venció sin conversión a plan pago."
        : "La suscripción venció sin renovación registrada.",
    });
  }

  const ultimaActividad =
    [ultimoTurno?.createdAt, doctor.pacientes[0]?.createdAt]
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const buckets = bucketsUltimosMeses(4);
  const usoMensual = buckets.map(({ year, month, label }) => ({
    mes: label,
    pacientes: doctor.pacientes.filter(
      (p) => p.createdAt.getUTCFullYear() === year && p.createdAt.getUTCMonth() === month
    ).length,
  }));

  const secretarias = doctor.doctorAsignaciones
    .map((a) => `${a.secretaria.nombre} ${a.secretaria.apellido}`.trim())
    .filter(Boolean);

  return { ...resumen, ultimaActividad, historial, usoMensual, secretarias };
}

function restarMeses(fecha: Date, meses: number): Date {
  const d = new Date(fecha);
  d.setUTCMonth(d.getUTCMonth() - meses);
  return d;
}

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

export function formatFechaCorta(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", { timeZone: TIME_ZONE, day: "numeric", month: "short", year: "numeric" });
}

export function formatDiasParaVencer(dias: number | null): string {
  if (dias === null) return "";
  if (dias < 0) return "Venció";
  if (dias === 0) return "Vence hoy";
  if (dias === 1) return "Vence en 1 día";
  return `Vence en ${dias} días`;
}

export function formatMoneyARS(monto: number): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(
    monto
  );
}
