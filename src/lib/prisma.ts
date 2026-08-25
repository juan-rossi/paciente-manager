import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  // `prisma dev`'s local proxy recommends capping connections and keeping the
  // idle timeout as short as possible instead of letting pg hold pooled
  // connections open, which was surfacing as "Server has closed the connection".
  max: 10,
  idleTimeoutMillis: 100,
  connectionTimeoutMillis: 0,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
