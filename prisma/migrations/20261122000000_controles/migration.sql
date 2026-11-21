-- AlterEnum: auditoría de los controles
ALTER TYPE "AuditEntidad" ADD VALUE 'CONTROL';

-- CreateTable: controles con fecha (peso, presión, talla, glucemia...)
CREATE TABLE "PatientControl" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "peso" DOUBLE PRECISION,
    "talla" DOUBLE PRECISION,
    "perimetroCefalico" DOUBLE PRECISION,
    "cintura" DOUBLE PRECISION,
    "porcentajeGrasa" DOUBLE PRECISION,
    "presionSistolica" DOUBLE PRECISION,
    "presionDiastolica" DOUBLE PRECISION,
    "frecuenciaCardiaca" DOUBLE PRECISION,
    "glucemia" DOUBLE PRECISION,
    "hba1c" DOUBLE PRECISION,
    "litemia" DOUBLE PRECISION,
    "alturaUterina" DOUBLE PRECISION,
    "frecuenciaCardiacaFetal" DOUBLE PRECISION,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PatientControl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientControl_patientId_fecha_idx" ON "PatientControl"("patientId", "fecha");

-- AddForeignKey
ALTER TABLE "PatientControl" ADD CONSTRAINT "PatientControl_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
