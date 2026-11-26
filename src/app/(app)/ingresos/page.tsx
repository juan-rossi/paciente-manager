import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAranceles } from "@/lib/ingresos-server";
import {
  esMes,
  ingresosPorMes,
  mesDeFechaBA,
  proyectarIngresos,
  rangoMesBA,
  resumirIngresos,
  sumarMeses,
} from "@/lib/ingresos";
import { IngresosReporte } from "@/components/ingresos/ingresos-reporte";

export const dynamic = "force-dynamic";

// Meses que muestra el gráfico de evolución (incluye el elegido).
const MESES_EVOLUCION = 6;
// Hasta cuántos meses hacia adelante se puede navegar (solo proyección).
const MESES_FUTUROS = 2;

type Props = { searchParams: Promise<{ mes?: string; lugar?: string }> };

// Reporte de ingresos: solo el médico (la asistente marca asistencia desde
// la agenda, pero nunca ve montos). El proxy ya la redirige; esto es la red.
export default async function IngresosPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "DOCTOR") redirect("/turnos");

  const ahora = new Date();
  const mesActual = mesDeFechaBA(ahora);
  const params = await searchParams;
  const mes =
    esMes(params.mes) && params.mes <= sumarMeses(mesActual, MESES_FUTUROS) ? params.mes : mesActual;

  const lugares = await prisma.lugarDeTrabajo.findMany({
    where: { userId: user.id, deletedAt: null },
    select: { id: true, nombre: true },
    orderBy: { createdAt: "asc" },
  });
  const lugarId = lugares.some((l) => l.id === params.lugar) ? params.lugar! : null;

  const { desde, hasta } = rangoMesBA(mes);
  const mesesEvolucion = Array.from({ length: MESES_EVOLUCION }, (_, i) =>
    sumarMeses(mes, i - MESES_EVOLUCION + 1)
  );
  const filtroBase = {
    doctorId: user.id,
    estado: "CONFIRMADO" as const,
    ...(lugarId ? { lugarId } : {}),
  };

  const [aranceles, turnos, turnosEvolucion, coberturasSinArancel] = await Promise.all([
    getAranceles(user.id),
    prisma.turno.findMany({
      where: { ...filtroBase, inicio: { gte: desde, lt: hasta } },
      select: {
        id: true,
        inicio: true,
        nombreYApellido: true,
        obraSocial: true,
        asistencia: true,
        montoCobertura: true,
        montoPlus: true,
        lugarId: true,
      },
      orderBy: { inicio: "asc" },
    }),
    prisma.turno.findMany({
      where: {
        ...filtroBase,
        asistencia: "ASISTIO",
        inicio: { gte: rangoMesBA(mesesEvolucion[0]).desde, lt: hasta },
      },
      select: { inicio: true, obraSocial: true, asistencia: true, montoCobertura: true, montoPlus: true },
    }),
    prisma.doctorPrepaga.count({ where: { doctorId: user.id, montoConsulta: null } }),
  ]);

  const resumen = resumirIngresos(turnos, ahora);
  const proyectado = proyectarIngresos(turnos, aranceles, ahora);
  const evolucion = ingresosPorMes(turnosEvolucion, mesesEvolucion);
  const sinAranceles = aranceles.particular == null || coberturasSinArancel > 0;

  return (
    <IngresosReporte
      mes={mes}
      mesActual={mesActual}
      mesMaximo={sumarMeses(mesActual, MESES_FUTUROS)}
      lugares={lugares.map((l) => ({ id: l.id, nombre: l.nombre ?? "Consulta particular" }))}
      lugarId={lugarId}
      resumen={resumen}
      proyectado={proyectado}
      evolucion={evolucion}
      sinAranceles={sinAranceles}
      hoy={ahora.toISOString()}
      turnos={turnos.map((t) => ({ ...t, inicio: t.inicio.toISOString() }))}
    />
  );
}
