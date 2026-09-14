-- CreateEnum
CREATE TYPE "ConsentimientoTipo" AS ENUM ('VERBAL', 'ESCRITO');

-- CreateEnum
CREATE TYPE "ConsentimientoEstado" AS ENUM ('OTORGADO', 'RECHAZADO');

-- AlterEnum
ALTER TYPE "AuditEntidad" ADD VALUE 'CONSENTIMIENTO';

-- CreateTable
CREATE TABLE "ConsentimientoInformado" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedimiento" TEXT NOT NULL,
    "riesgosBeneficios" TEXT NOT NULL,
    "alternativas" TEXT,
    "tipo" "ConsentimientoTipo" NOT NULL,
    "estado" "ConsentimientoEstado" NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "revocadoEn" TIMESTAMP(3),
    "revocadoMotivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ConsentimientoInformado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentimientoInformado_patientId_idx" ON "ConsentimientoInformado"("patientId");

-- AddForeignKey
ALTER TABLE "ConsentimientoInformado" ADD CONSTRAINT "ConsentimientoInformado_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
