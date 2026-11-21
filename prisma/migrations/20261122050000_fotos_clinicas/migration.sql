-- AlterEnum: auditoría de las fotos clínicas
ALTER TYPE "AuditEntidad" ADD VALUE 'FOTO';

-- CreateTable: fotos clínicas (dermatología)
CREATE TABLE "PatientFoto" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "zona" TEXT NOT NULL,
    "nota" TEXT,
    "datos" BYTEA NOT NULL,
    "miniatura" BYTEA NOT NULL,
    "ancho" INTEGER NOT NULL,
    "alto" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PatientFoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientFoto_patientId_fecha_idx" ON "PatientFoto"("patientId", "fecha");

-- AddForeignKey
ALTER TABLE "PatientFoto" ADD CONSTRAINT "PatientFoto_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
