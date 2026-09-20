import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { diaSemanaFromDate } from "../src/lib/slots";
import { formatHoraBA } from "../src/lib/timezone";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Direcciones placeholder -- no se geocodifican (quedan sin lat/lng), el
// único propósito es no dejar el campo obligatorio vacío hasta que el
// médico cargue la real desde "Mi práctica".
const DIRECCIONES_PLACEHOLDER = [
  "Av. Corrientes 1234, CABA",
  "Av. Santa Fe 2345, CABA",
  "Av. Rivadavia 3456, CABA",
  "Av. Cabildo 4567, CABA",
  "Av. Callao 567, CABA",
  "Av. Las Heras 890, CABA",
];

function randomDireccion(): string {
  return DIRECCIONES_PLACEHOLDER[Math.floor(Math.random() * DIRECCIONES_PLACEHOLDER.length)];
}

function randomTelefono(): string {
  const grupo = () => Math.floor(1000 + Math.random() * 9000);
  return `+54 9 11 ${grupo()}-${grupo()}`;
}

// Migra a cualquier médico que tenga `WorkScheduleBlock` sin lugar asignado
// (`lugarId: null`) -- ya sea porque nunca cargó ningún lugar, o porque ya
// tenía lugares cargados pero esos horarios en particular quedaron de antes
// de que existiera "Mi práctica" y nunca se editaron. En ambos casos, sin
// esta migración esos horarios quedan huérfanos: ningún tab de la pantalla
// nueva los muestra (aunque los turnos ya agendados ahí siguen existiendo
// en la base -- lo que se pierde es la posibilidad de verlos/editarlos
// desde "Mi práctica", no el turno en sí).
//
// Por cada médico con bloques huérfanos: reutiliza su lugar PARTICULAR
// activo si ya tiene uno; si no, le crea uno nuevo con datos placeholder.
// Nunca borra ni toca ningún `Turno`.
//
// Idempotente: una vez reasignados, esos bloques ya no tienen
// `lugarId: null`, así que correrlo de nuevo no encuentra nada para hacer.
async function main() {
  const bloquesHuerfanos = await prisma.workScheduleBlock.findMany({
    where: { lugarId: null },
    select: { userId: true },
    distinct: ["userId"],
  });

  console.log(`Médicos con horarios sin lugar asignado: ${bloquesHuerfanos.length}`);

  let totalLugaresCreados = 0;
  let totalBloquesReasignados = 0;

  for (const { userId } of bloquesHuerfanos) {
    const doctor = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, nombre: true, apellido: true },
    });

    let lugar = await prisma.lugarDeTrabajo.findFirst({
      where: { userId, tipo: "PARTICULAR", deletedAt: null },
    });
    let esNuevo = false;

    if (!lugar) {
      lugar = await prisma.lugarDeTrabajo.create({
        data: {
          userId,
          tipo: "PARTICULAR",
          direccion: randomDireccion(),
          telefono: randomTelefono(),
        },
      });
      esNuevo = true;
      totalLugaresCreados++;
    }

    const { count } = await prisma.workScheduleBlock.updateMany({
      where: { userId, lugarId: null },
      data: { lugarId: lugar.id },
    });
    totalBloquesReasignados += count;

    console.log(
      `- ${doctor.email} (${doctor.nombre} ${doctor.apellido}): lugar particular ${lugar.id} (${esNuevo ? "nuevo" : "ya existía"}), ${count} horario(s) reasignado(s).`
    );
  }

  console.log(
    `Listo: ${totalLugaresCreados} lugar(es) nuevo(s) creado(s), ${totalBloquesReasignados} horario(s) reasignado(s) en total.`
  );

  await backfillTurnos();
}

// Los `Turno` agendados antes de esta feature (o en un bloque legado sin
// lugar) también quedaron con `lugarId: null`. Esto no es solo cosmético:
// el borrado de un lugar decide soft-delete vs. hard-delete contando
// `Turno` con ese `lugarId` (ver DELETE en /api/lugares-trabajo/[id]) --
// si esos turnos históricos nunca quedan asociados, un lugar que en la
// práctica sí tiene turnos reales se borraría de verdad.
//
// Por cada turno huérfano, se infiere su lugar buscando qué
// `WorkScheduleBlock` (ya con lugarId asignado) cubre su día de la semana
// y horario. Si ningún bloque lo cubre (turno fuera de cualquier horario
// cargado, p.ej. un sobreturno viejo o un horario borrado desde entonces),
// se deja `lugarId: null` -- no hay forma de inferirlo con certeza, y no
// romper nada existente importa más que completar el dato. Nunca se toca
// ningún otro campo del turno.
async function backfillTurnos() {
  const doctorIds = await prisma.turno.findMany({
    where: { lugarId: null },
    select: { doctorId: true },
    distinct: ["doctorId"],
  });

  let totalTurnosAsociados = 0;
  let totalTurnosSinCobertura = 0;

  for (const { doctorId } of doctorIds) {
    const [bloques, turnos] = await Promise.all([
      prisma.workScheduleBlock.findMany({
        where: { userId: doctorId, lugarId: { not: null } },
      }),
      prisma.turno.findMany({
        where: { doctorId, lugarId: null },
        select: { id: true, inicio: true, fin: true },
      }),
    ]);

    let asociados = 0;
    let sinCobertura = 0;

    for (const turno of turnos) {
      const diaSemana = diaSemanaFromDate(turno.inicio);
      const horaInicio = formatHoraBA(turno.inicio);
      const horaFin = formatHoraBA(turno.fin);

      const bloqueCubridor = bloques.find(
        (b) => b.diaSemana === diaSemana && b.horaInicio <= horaInicio && horaFin <= b.horaFin
      );

      if (!bloqueCubridor) {
        sinCobertura++;
        continue;
      }

      await prisma.turno.update({
        where: { id: turno.id },
        data: { lugarId: bloqueCubridor.lugarId },
      });
      asociados++;
    }

    totalTurnosAsociados += asociados;
    totalTurnosSinCobertura += sinCobertura;

    console.log(
      `- turnos históricos de ${doctorId}: ${asociados} asociado(s) por horario cubridor, ${sinCobertura} sin ningún horario que los cubra (quedan sin lugar).`
    );
  }

  console.log(
    `Listo (turnos): ${totalTurnosAsociados} turno(s) asociado(s) a un lugar, ${totalTurnosSinCobertura} sin cobertura de ningún horario.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
