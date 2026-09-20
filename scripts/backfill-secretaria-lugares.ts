import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// La selección de lugares por secretaria es una feature nueva -- toda
// relación médico-secretaria creada antes quedó sin ningún
// `DoctorSecretariaLugar`. Este script les asigna el lugar PARTICULAR activo
// del médico correspondiente (el secretario podrá ajustarlo después desde
// "Usuarios" en Configuración).
//
// Nunca borra ni toca ninguna relación existente, solo agrega las filas de
// `DoctorSecretariaLugar` que falten. Idempotente: una vez asignado un lugar
// a una relación, esa relación ya no aparece en la búsqueda de huérfanas.
async function main() {
  const asignacionesSinLugar = await prisma.doctorSecretaria.findMany({
    where: { lugares: { none: {} } },
    select: {
      id: true,
      doctorId: true,
      doctor: { select: { email: true } },
      secretaria: { select: { email: true } },
    },
  });

  console.log(`Relaciones médico-secretaria sin ningún lugar asignado: ${asignacionesSinLugar.length}`);

  let asignadas = 0;
  let sinParticular = 0;

  for (const asignacion of asignacionesSinLugar) {
    const particular = await prisma.lugarDeTrabajo.findFirst({
      where: { userId: asignacion.doctorId, tipo: "PARTICULAR", deletedAt: null },
    });

    if (!particular) {
      sinParticular++;
      console.log(
        `- SIN lugar particular: ${asignacion.secretaria.email} (secretaria de ${asignacion.doctor.email}) -- requiere asignación manual.`
      );
      continue;
    }

    await prisma.doctorSecretariaLugar.create({
      data: { doctorSecretariaId: asignacion.id, lugarId: particular.id },
    });
    asignadas++;
    console.log(
      `- ${asignacion.secretaria.email}: asignado el particular de ${asignacion.doctor.email} (${particular.id}).`
    );
  }

  console.log(
    `Listo: ${asignadas} relación(es) completada(s), ${sinParticular} sin lugar particular (revisar a mano).`
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
