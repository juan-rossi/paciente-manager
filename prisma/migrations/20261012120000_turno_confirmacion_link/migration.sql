-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "confirmadoAt" TIMESTAMP(3),
ADD COLUMN "linkCodigo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Turno_linkCodigo_key" ON "Turno"("linkCodigo");
