-- CreateEnum
CREATE TYPE "AsistenciaSesion" AS ENUM ('PRESENTE', 'AUSENTE', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ModalidadSesion" AS ENUM ('PRESENCIAL', 'ONLINE');

-- CreateEnum
CREATE TYPE "NivelRiesgo" AS ENUM ('SIN_RIESGO', 'BAJO', 'MODERADO', 'ALTO');

-- AlterTable: sesiones de psicología
ALTER TABLE "PatientEvolucion" ADD COLUMN "asistencia" "AsistenciaSesion",
ADD COLUMN "modalidad" "ModalidadSesion",
ADD COLUMN "riesgo" "NivelRiesgo",
ADD COLUMN "notasPrivadas" TEXT;
