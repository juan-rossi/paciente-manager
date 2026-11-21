-- AlterTable: cada foto clínica pertenece a una evolución
ALTER TABLE "PatientFoto" ADD COLUMN "evolucionId" TEXT;

-- CreateIndex
CREATE INDEX "PatientFoto_evolucionId_idx" ON "PatientFoto"("evolucionId");

-- AddForeignKey
ALTER TABLE "PatientFoto" ADD CONSTRAINT "PatientFoto_evolucionId_fkey" FOREIGN KEY ("evolucionId") REFERENCES "PatientEvolucion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
