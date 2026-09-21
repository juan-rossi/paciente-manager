import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { parseCiudadDeDireccion } from "../src/lib/parse-ciudad-direccion";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// `LugarDeTrabajo.ciudad` es un campo nuevo -- todo lugar cargado antes de
// que existiera quedó con `ciudad: null`, aunque su `direccion` ya esté
// geocodeada (así fue como se detectó: el directorio público filtra/agrupa
// por ciudad considerando todos los lugares de un médico, pero uno sin
// `ciudad` no aporta ninguna al listado, aunque sí aporte su distancia).
//
// En vez de pedirle la ciudad a Google de nuevo (reverse geocoding, otra
// llamada paga), se infiere de la propia `direccion` ya guardada -- Google
// Places siempre la devuelve en un formato reconocible para Argentina (ver
// `parseCiudadDeDireccion`). Nunca toca `direccion`/`latitud`/`longitud`,
// solo completa `ciudad` donde está vacía y se pudo inferir algo.
//
// Idempotente: una vez completada, esa fila ya no aparece en la búsqueda de
// huérfanas.
async function main() {
  const lugaresSinCiudad = await prisma.lugarDeTrabajo.findMany({
    where: { ciudad: null },
    select: { id: true, direccion: true, userId: true },
  });

  console.log(`Lugares sin ciudad: ${lugaresSinCiudad.length}`);

  let completados = 0;
  let sinInferir = 0;

  for (const lugar of lugaresSinCiudad) {
    const ciudad = parseCiudadDeDireccion(lugar.direccion);
    if (!ciudad) {
      sinInferir++;
      console.log(`- SIN inferir: ${lugar.id} ("${lugar.direccion}") -- requiere revisión manual.`);
      continue;
    }

    await prisma.lugarDeTrabajo.update({ where: { id: lugar.id }, data: { ciudad } });
    completados++;
    console.log(`- ${lugar.id}: "${lugar.direccion}" -> ciudad "${ciudad}".`);
  }

  console.log(`Listo: ${completados} lugar(es) completados, ${sinInferir} sin poder inferir (revisar a mano).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
