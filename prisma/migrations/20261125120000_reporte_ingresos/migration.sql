-- CreateEnum
CREATE TYPE "TurnoAsistencia" AS ENUM ('ASISTIO', 'AUSENTE');

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "asistencia" "TurnoAsistencia",
ADD COLUMN "montoCobertura" INTEGER,
ADD COLUMN "montoPlus" INTEGER;

-- AlterTable
ALTER TABLE "DoctorPrepaga" ADD COLUMN "montoConsulta" INTEGER,
ADD COLUMN "montoPlus" INTEGER;

-- CreateIndex
CREATE INDEX "Turno_doctorId_inicio_idx" ON "Turno"("doctorId", "inicio");
