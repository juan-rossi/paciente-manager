-- CreateEnum
CREATE TYPE "TeleconsultaCobro" AS ENUM ('ANTES', 'DESPUES');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "teleconsultaCobro" "TeleconsultaCobro" NOT NULL DEFAULT 'ANTES',
ADD COLUMN "aliasCobro" TEXT;
