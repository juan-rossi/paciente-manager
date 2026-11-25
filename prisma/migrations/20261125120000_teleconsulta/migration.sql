-- AlterEnum
ALTER TYPE "LugarTrabajoTipo" ADD VALUE 'VIRTUAL';

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "salaVideoNombre" TEXT,
ADD COLUMN "consentimientoRemotoAt" TIMESTAMP(3);
