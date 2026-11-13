-- AlterEnum
ALTER TYPE "AuditEntidad" ADD VALUE 'ODONTOGRAMA';

-- CreateEnum
CREATE TYPE "OdontogramaTipo" AS ENUM ('INICIAL', 'CONTROL');

-- CreateTable
CREATE TABLE "PatientOdontograma" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "tipo" "OdontogramaTipo" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "nota" TEXT,
    "datos" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PatientOdontograma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientOdontograma_patientId_fecha_idx" ON "PatientOdontograma"("patientId", "fecha");

-- AddForeignKey
ALTER TABLE "PatientOdontograma" ADD CONSTRAINT "PatientOdontograma_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
