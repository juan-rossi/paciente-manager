import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// SOLO LECTURA. Responde "¿puedo deployar ahora sin pisarle la jornada a
// nadie?" (ver skill `canDeploy`): mira los horarios configurados de los
// médicos (`WorkScheduleBlock`, plantilla semanal, más `HorarioExcepcional`,
// días puntuales habilitados) y dice si en este momento hay alguno activo.
// Si hay, calcula cuándo termina la cadena de horarios superpuestos /
// encadenados, o sea a partir de cuándo ya no queda NADIE con horario activo.
//
// Hora de referencia: Buenos Aires (UTC-3 fijo, Argentina no tiene horario
// de verano -- mismo criterio que src/lib/timezone.ts). `NOW` (ISO) permite
// simular otro instante para probar.
//
// Se ignoran lugares dados de baja (`deletedAt`). No se descuentan los
// `BloqueoHorario` (si un médico bloqueó el día, igual cuenta como activo):
// es a propósito, para errar del lado conservador.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BA_OFFSET_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;
// getUTCDay() de la fecha "corrida" a BA: 0 = domingo.
const DIAS = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"] as const;

type Intervalo = { inicio: Date; fin: Date; medico: string; lugar: string };

function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

function fmtBA(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function fmtDuracion(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const partes: string[] = [];
  if (d) partes.push(`${d}d`);
  if (h) partes.push(`${h}h`);
  partes.push(`${m}min`);
  return partes.join(" ");
}

async function main() {
  const now = process.env.NOW ? new Date(process.env.NOW) : new Date();
  // Medianoche BA de hoy, expresada como instante UTC.
  const nowBA = new Date(now.getTime() - BA_OFFSET_MS);
  const hoyBA0 = Date.UTC(nowBA.getUTCFullYear(), nowBA.getUTCMonth(), nowBA.getUTCDate()) + BA_OFFSET_MS;

  const [bloques, excepcionales] = await Promise.all([
    prisma.workScheduleBlock.findMany({
      where: { lugar: { deletedAt: null } },
      select: {
        diaSemana: true,
        horaInicio: true,
        horaFin: true,
        user: { select: { nombre: true, apellido: true, email: true } },
        lugar: { select: { nombre: true, direccion: true } },
      },
    }),
    prisma.horarioExcepcional.findMany({
      where: {
        lugar: { deletedAt: null },
        fin: { gt: new Date(now.getTime() - DIA_MS) },
        inicio: { lt: new Date(now.getTime() + 8 * DIA_MS) },
      },
      select: {
        inicio: true,
        fin: true,
        user: { select: { nombre: true, apellido: true, email: true } },
        lugar: { select: { nombre: true, direccion: true } },
      },
    }),
  ]);

  const nombre = (u: { nombre: string; apellido: string; email: string }) =>
    `${u.nombre} ${u.apellido}`.trim() + ` <${u.email}>`;
  const lugarStr = (l: { nombre: string | null; direccion: string }) => l.nombre || l.direccion;

  // Expandir la plantilla semanal a instantes concretos desde ayer hasta
  // dentro de 8 días (cubre bloques que cruzan medianoche y la "próxima
  // ventana" aunque sea la semana que viene).
  const intervalos: Intervalo[] = [];
  for (let off = -1; off <= 8; off++) {
    const dia0 = hoyBA0 + off * DIA_MS;
    const diaSemana = DIAS[new Date(dia0 - BA_OFFSET_MS + 12 * 60 * 60 * 1000).getUTCDay()];
    for (const b of bloques) {
      if (b.diaSemana !== diaSemana) continue;
      const ini = hhmmToMin(b.horaInicio);
      let fin = hhmmToMin(b.horaFin);
      if (fin <= ini) fin += 1440; // cruza medianoche
      intervalos.push({
        inicio: new Date(dia0 + ini * 60000),
        fin: new Date(dia0 + fin * 60000),
        medico: nombre(b.user),
        lugar: lugarStr(b.lugar),
      });
    }
  }
  for (const e of excepcionales) {
    intervalos.push({ inicio: e.inicio, fin: e.fin, medico: nombre(e.user) , lugar: `${lugarStr(e.lugar)} (excepcional)` });
  }

  const activos = intervalos.filter((i) => i.inicio <= now && now < i.fin);

  console.log(`Ahora (BA): ${fmtBA(now)}`);
  console.log(`Bloques semanales cargados: ${bloques.length} · horarios excepcionales en ventana: ${excepcionales.length}`);
  console.log("");

  if (activos.length === 0) {
    const proximo = intervalos
      .filter((i) => i.inicio > now)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0];
    console.log("RESULTADO: LIBRE -- ningún médico tiene un horario activo ahora.");
    if (proximo) {
      console.log(
        `Próximo horario en empezar: ${fmtBA(proximo.inicio)} (en ${fmtDuracion(proximo.inicio.getTime() - now.getTime())}) -- ${proximo.medico} @ ${proximo.lugar}`,
      );
    } else {
      console.log("No hay ningún horario en los próximos 8 días.");
    }
    return;
  }

  // Encadenar: mientras algún intervalo empiece antes (o justo cuando) del
  // fin actual y termine después, extiende la ocupación.
  let libreDesde = new Date(Math.max(...activos.map((i) => i.fin.getTime())));
  for (;;) {
    const extiende = intervalos.filter((i) => i.inicio <= libreDesde && i.fin > libreDesde);
    if (extiende.length === 0) break;
    libreDesde = new Date(Math.max(...extiende.map((i) => i.fin.getTime())));
  }
  const proximoDespues = intervalos
    .filter((i) => i.inicio > libreDesde)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())[0];

  console.log(`RESULTADO: OCUPADO -- ${activos.length} horario(s) activo(s) ahora:`);
  for (const a of activos.sort((x, y) => x.fin.getTime() - y.fin.getTime())) {
    console.log(`  - ${a.medico} @ ${a.lugar}: hasta ${fmtBA(a.fin)}`);
  }
  console.log("");
  console.log(`Nadie con horario activo a partir de: ${fmtBA(libreDesde)} (faltan ${fmtDuracion(libreDesde.getTime() - now.getTime())})`);
  if (proximoDespues) {
    console.log(
      `Esa ventana libre dura hasta: ${fmtBA(proximoDespues.inicio)} (${fmtDuracion(proximoDespues.inicio.getTime() - libreDesde.getTime())}) -- ${proximoDespues.medico} @ ${proximoDespues.lugar}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
