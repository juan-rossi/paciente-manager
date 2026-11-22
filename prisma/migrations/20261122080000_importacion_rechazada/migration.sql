-- AlterEnum
ALTER TYPE "ImportacionEstado" ADD VALUE 'RECHAZADA';

-- AlterTable
ALTER TABLE "ImportacionHC" ADD COLUMN     "rechazadaAt" TIMESTAMP(3);
