-- CreateEnum
CREATE TYPE "PlanTipo" AS ENUM ('BASICA', 'PREMIUM');

-- DropIndex
DROP INDEX "Patient_nombreYApellido_idx";

-- DropIndex
DROP INDEX "Patient_nroDocumento_idx";

-- AlterTable (nullable primero -- ya hay filas; se backfillea abajo antes de exigir NOT NULL)
ALTER TABLE "Patient" ADD COLUMN     "doctorId" TEXT;

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "doctorId" TEXT;

-- Backfill: hoy hay un solo DOCTOR por base (single-tenant histórico) --
-- todos los pacientes/turnos existentes son suyos.
UPDATE "Patient" SET "doctorId" = (SELECT id FROM "User" WHERE role = 'DOCTOR' LIMIT 1);
UPDATE "Turno" SET "doctorId" = (SELECT id FROM "User" WHERE role = 'DOCTOR' LIMIT 1);

ALTER TABLE "Patient" ALTER COLUMN "doctorId" SET NOT NULL;
ALTER TABLE "Turno" ALTER COLUMN "doctorId" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "apellido" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "nroMatricula" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "plan" "PlanTipo" NOT NULL DEFAULT 'BASICA',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Patient_doctorId_idx" ON "Patient"("doctorId");

-- CreateIndex
CREATE INDEX "Patient_doctorId_nroDocumento_idx" ON "Patient"("doctorId", "nroDocumento");

-- CreateIndex
CREATE INDEX "Patient_doctorId_nombreYApellido_idx" ON "Patient"("doctorId", "nombreYApellido");

-- CreateIndex
CREATE INDEX "Turno_doctorId_idx" ON "Turno"("doctorId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
