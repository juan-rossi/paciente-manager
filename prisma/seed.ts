import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const nombre = process.env.SEED_USER_NOMBRE ?? "Doctor/a";

  if (!email || !password) {
    throw new Error(
      "Definí SEED_USER_EMAIL y SEED_USER_PASSWORD en .env antes de correr el seed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, nombre, role: "DOCTOR" },
    create: { email, passwordHash, nombre, role: "DOCTOR" },
  });

  console.log(`Usuario listo: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
