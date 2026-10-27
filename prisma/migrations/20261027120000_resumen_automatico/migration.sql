-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resumenAutoAntecedentes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "resumenAutoEvoluciones" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "resumenAutomatico" BOOLEAN NOT NULL DEFAULT false;
