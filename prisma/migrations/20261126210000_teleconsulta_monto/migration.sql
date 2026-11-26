-- AlterTable
ALTER TABLE "User" ADD COLUMN "montoTeleconsulta" INTEGER,
ADD COLUMN "montoTeleconsultaUsaParticular" BOOLEAN NOT NULL DEFAULT true;
