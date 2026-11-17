import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// `prisma dev` (local) runs on PGlite, which is single-connection under the
// hood: several heavy queries in parallel over separate connections make it
// drop them with "Server has closed the connection" (e.g. /admin/marketing/
// bienvenidas fires ~5 at once). One connection serializes them and is fine
// locally; real Postgres keeps the normal pool.
const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // `prisma dev`'s local proxy recommends capping connections and keeping the
  // idle timeout as short as possible instead of letting pg hold pooled
  // connections open, which was surfacing as "Server has closed the connection".
  max: isLocalDb ? 1 : 10,
  idleTimeoutMillis: 100,
  connectionTimeoutMillis: 0,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
