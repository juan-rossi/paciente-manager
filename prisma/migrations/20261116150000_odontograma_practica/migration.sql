-- AlterEnum
ALTER TYPE "AuditEntidad" ADD VALUE 'PRACTICA_ODONTOLOGICA';

-- CreateTable
CREATE TABLE "OdontogramaPractica" (
    "id" TEXT NOT NULL,
    "odontogramaId" TEXT NOT NULL,
    "practicaId" TEXT NOT NULL,
    "pieza" TEXT,
    "caras" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OdontogramaPractica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OdontogramaPractica_odontogramaId_idx" ON "OdontogramaPractica"("odontogramaId");

-- AddForeignKey
ALTER TABLE "OdontogramaPractica" ADD CONSTRAINT "OdontogramaPractica_odontogramaId_fkey" FOREIGN KEY ("odontogramaId") REFERENCES "PatientOdontograma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OdontogramaPractica" ADD CONSTRAINT "OdontogramaPractica_practicaId_fkey" FOREIGN KEY ("practicaId") REFERENCES "PracticaOdontologica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
