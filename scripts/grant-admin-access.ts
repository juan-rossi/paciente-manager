import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// A diferencia de create-admin.ts (que crea/actualiza cuentas ADMIN puras,
// sin tenant), este script le da -- o le saca -- acceso al panel /admin a
// una cuenta DOCTOR o SECRETARY que YA existe, sin tocar su rol, su
// password ni su login (Google o contraseña siguen funcionando igual).
// Pensado para el caso típico: un médico que también es owner/staff de
// Semio 360 y necesita ver el panel admin con su cuenta de siempre.
async function main() {
  const email = process.env.GRANT_ADMIN_EMAIL;
  const revoke = process.env.GRANT_ADMIN_REVOKE === "true";

  if (!email) {
    throw new Error(
      "Definí GRANT_ADMIN_EMAIL (el mail de la cuenta DOCTOR/SECRETARY que ya existe) antes de correr este script. Opcionalmente, GRANT_ADMIN_REVOKE=true para sacarle el acceso en vez de dárselo."
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!existing) {
    throw new Error(
      `No existe ningún usuario con el email ${normalizedEmail}. Este script solo otorga (o retira) acceso admin a una cuenta que ya existe -- no crea cuentas nuevas. Si necesitás crear una cuenta ADMIN nueva, usá scripts/create-admin.ts.`
    );
  }
  if (existing.role === "ADMIN") {
    throw new Error(
      `${normalizedEmail} ya es una cuenta ADMIN de plataforma (sin tenant) -- ya tiene acceso completo a /admin por su rol, este script no aplica.`
    );
  }

  const user = await prisma.user.update({
    where: { email: normalizedEmail },
    data: { isAdmin: !revoke },
  });

  console.log(
    `${revoke ? "Acceso admin retirado de" : "Acceso admin otorgado a"} ${user.email} (${user.nombre} ${user.apellido}, rol: ${user.role}). Sigue entrando con su login normal (Google o contraseña) y ${revoke ? "ya no puede" : "ahora puede"} ver /admin.`
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
