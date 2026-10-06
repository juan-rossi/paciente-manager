-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "cancelTokenHash" TEXT,
ADD COLUMN "canceladoPorPacienteAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Turno_cancelTokenHash_key" ON "Turno"("cancelTokenHash");

-- CreateIndex
CREATE INDEX "Turno_doctorId_canceladoPorPacienteAt_idx" ON "Turno"("doctorId", "canceladoPorPacienteAt");
