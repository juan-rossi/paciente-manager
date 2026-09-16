-- CreateEnum
CREATE TYPE "PlanDuracion" AS ENUM ('MENSUAL', 'SEMESTRAL', 'ANUAL', 'BIANUAL');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "planDuracion" "PlanDuracion",
ADD COLUMN     "planEndsAt" TIMESTAMP(3);
