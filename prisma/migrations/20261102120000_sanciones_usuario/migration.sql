-- AlterTable
ALTER TABLE "User" ADD COLUMN     "fueraDelDirectorioAt" TIMESTAMP(3),
ADD COLUMN     "fueraDelDirectorioMotivo" TEXT,
ADD COLUMN     "fueraDelDirectorioPorId" TEXT,
ADD COLUMN     "suspendidoAt" TIMESTAMP(3),
ADD COLUMN     "suspendidoPorId" TEXT,
ADD COLUMN     "suspensionMotivo" TEXT;
