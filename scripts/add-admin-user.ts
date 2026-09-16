import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Punto de entrada único para dar acceso al panel /admin de Semio 360:
// - Si el email NO existe todavía, crea una cuenta ADMIN de plataforma
//   pura (sin tenant), igual que scripts/create-admin.ts.
// - Si el email YA existe (DOCTOR o SECRETARY), le setea `isAdmin = true`
//   sin tocar su rol, su password ni sus datos -- igual que
//   scripts/grant-admin-access.ts.
// - Si el email ya es una cuenta ADMIN, no hace nada (ya tiene acceso).
async function main() {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    throw new Error("Definí ADMIN_EMAIL antes de correr este script.");
  }
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!existing) {
    const password = process.env.ADMIN_PASSWORD;
    const nombre = process.env.ADMIN_NOMBRE ?? "Owner";
    const apellido = process.env.ADMIN_APELLIDO ?? "";
    if (!password) {
      throw new Error(
        `No existe ningún usuario con el email ${normalizedEmail} -- para crear una cuenta ADMIN nueva definí también ADMIN_PASSWORD (mínimo 8 caracteres) y, opcionalmente, ADMIN_NOMBRE / ADMIN_APELLIDO.`
      );
    }
    if (password.length < 8) {
      throw new Error("ADMIN_PASSWORD es muy corta (mínimo 8 caracteres).");
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: normalizedEmail, passwordHash, nombre, apellido, role: "ADMIN" },
    });
    console.log(`Cuenta ADMIN nueva creada: ${user.email} (${user.nombre} ${user.apellido}).`);
    return;
  }

  if (existing.role === "ADMIN") {
    console.log(`${existing.email} ya es una cuenta ADMIN de plataforma -- no hace falta nada.`);
    return;
  }

  const user = await prisma.user.update({
    where: { email: normalizedEmail },
    data: { isAdmin: true },
  });
  console.log(
    `Acceso admin otorgado a ${user.email} (${user.nombre} ${user.apellido}, rol: ${user.role}). Sigue entrando con su login normal (Google o contraseña) y ahora también puede ver /admin.`
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
