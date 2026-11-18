-- AlterTable: adulto responsable de pacientes menores de edad
ALTER TABLE "Patient" ADD COLUMN "responsableNombre" TEXT,
ADD COLUMN "responsableVinculo" TEXT,
ADD COLUMN "responsableDni" TEXT,
ADD COLUMN "responsableTelefono" TEXT;
