import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { esDataUrlFotoValida } from "../src/lib/imagen-perfil";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Hasta que existió `src/lib/imagen-perfil.ts`, la subida de la foto de
// perfil solo exigía el prefijo `data:image/`, así que pudo quedar guardado un
// SVG (u otra cosa) que se serviría desde nuestro dominio. Este script busca
// fotos que no sean un PNG/JPEG real en:
//   - User.fotoPerfilBase64 / User.fotoPublicaBase64 -> las pone en null
//   - ModeracionPerfil (FOTO, PENDIENTE)              -> las marca RECHAZADA
//
// Por defecto SOLO REPORTA. Para modificar la base: `--apply`.
//   npx tsx --env-file=.env scripts/limpiar-fotos-invalidas.ts [--apply]
const APPLY = process.argv.includes("--apply");

function prefijo(dataUrl: string) {
  return dataUrl.slice(0, 40);
}

async function main() {
  const usuarios = await prisma.user.findMany({
    where: { OR: [{ fotoPerfilBase64: { not: null } }, { fotoPublicaBase64: { not: null } }] },
    select: { id: true, email: true, fotoPerfilBase64: true, fotoPublicaBase64: true },
  });
  const revisiones = await prisma.moderacionPerfil.findMany({
    where: { campo: "FOTO", estado: "PENDIENTE" },
    select: { id: true, userId: true, contenido: true },
  });

  const usuariosInvalidos = usuarios
    .map((u) => ({
      ...u,
      perfilInvalida: u.fotoPerfilBase64 !== null && !esDataUrlFotoValida(u.fotoPerfilBase64),
      publicaInvalida: u.fotoPublicaBase64 !== null && !esDataUrlFotoValida(u.fotoPublicaBase64),
    }))
    .filter((u) => u.perfilInvalida || u.publicaInvalida);
  const revisionesInvalidas = revisiones.filter((r) => !esDataUrlFotoValida(r.contenido));

  console.log(`Usuarios con foto: ${usuarios.length} · con foto inválida: ${usuariosInvalidos.length}`);
  for (const u of usuariosInvalidos) {
    console.log(
      `  - ${u.id} ${u.email}` +
        (u.perfilInvalida ? ` | perfil: ${prefijo(u.fotoPerfilBase64!)}` : "") +
        (u.publicaInvalida ? ` | pública: ${prefijo(u.fotoPublicaBase64!)}` : "")
    );
  }
  console.log(
    `Revisiones de foto pendientes: ${revisiones.length} · inválidas: ${revisionesInvalidas.length}`
  );
  for (const r of revisionesInvalidas) console.log(`  - ${r.id} (user ${r.userId}) ${prefijo(r.contenido)}`);

  if (!APPLY) {
    console.log("\nSolo reporte. Para limpiar, volver a correr con --apply.");
    return;
  }

  const ahora = new Date();
  await prisma.$transaction([
    ...usuariosInvalidos.map((u) =>
      prisma.user.update({
        where: { id: u.id },
        data: {
          ...(u.perfilInvalida ? { fotoPerfilBase64: null } : {}),
          ...(u.publicaInvalida ? { fotoPublicaBase64: null } : {}),
        },
      })
    ),
    prisma.moderacionPerfil.updateMany({
      where: { id: { in: revisionesInvalidas.map((r) => r.id) } },
      data: { estado: "RECHAZADA", resueltaAt: ahora },
    }),
  ]);
  console.log(`\nLimpiado: ${usuariosInvalidos.length} usuarios, ${revisionesInvalidas.length} revisiones.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
