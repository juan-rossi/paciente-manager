import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Crea (o actualiza) un usuario ADMIN -- el owner/staff de Semio 360 que ve
// el panel cross-tenant en /admin (médicos activos/inactivos, vencimientos,
// conversión, MRR). A diferencia de un DOCTOR, un ADMIN NUNCA se crea por
// /signup ni por login con Google (ver src/auth.ts) -- es el único rol que
// se da de alta a mano, con este script, para que nadie pueda
// autootorgarse acceso a los datos de todos los médicos de la plataforma.
//
// Uso:
//   ADMIN_EMAIL=juan.rossi@devlights.com ADMIN_PASSWORD="..." \
//   ADMIN_NOMBRE="Juan" ADMIN_APELLIDO="Rossi" \
//     npx tsx scripts/create-admin.ts
//
// Correr una vez por entorno (cada entorno de Semio 360 tiene su propia
// base -- ver ENTORNOS.md) contra el DATABASE_URL de ese entorno.

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const nombre = process.env.ADMIN_NOMBRE ?? "Owner";
  const apellido = process.env.ADMIN_APELLIDO ?? "";

  if (!email || !password) {
    throw new Error(
      "Definí ADMIN_EMAIL y ADMIN_PASSWORD (y opcionalmente ADMIN_NOMBRE / ADMIN_APELLIDO) antes de correr este script."
    );
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD es muy corta (mínimo 8 caracteres).");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing && existing.role !== "ADMIN") {
    throw new Error(
      `Ya existe un usuario con ese email como ${existing.role} -- este script solo crea o actualiza cuentas ADMIN puras (sin tenant), nunca cambia el rol de una cuenta existente. Si lo que querés es darle acceso al panel /admin a este ${existing.role} sin tocar su cuenta ni su login, usá scripts/grant-admin-access.ts en cambio. Si de verdad necesitás una cuenta ADMIN nueva, elegí otro email.`
    );
  }

  const user = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { passwordHash, nombre, apellido, role: "ADMIN" },
    create: { email: normalizedEmail, passwordHash, nombre, apellido, role: "ADMIN" },
  });

  console.log(`Usuario ADMIN listo: ${user.email} (${user.nombre} ${user.apellido})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
