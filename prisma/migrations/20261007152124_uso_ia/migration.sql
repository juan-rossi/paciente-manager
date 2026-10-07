-- CreateEnum
CREATE TYPE "UsoIATipo" AS ENUM ('DICTADO', 'RESUMEN');

-- CreateTable
CREATE TABLE "UsoIA" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "tipo" "UsoIATipo" NOT NULL,
    "segundosAudio" INTEGER,
    "tokensEntrada" INTEGER,
    "tokensSalida" INTEGER,
    "costoUsd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsoIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionDolar" (
    "mes" TEXT NOT NULL,
    "arsPorUsd" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionDolar_pkey" PRIMARY KEY ("mes")
);

-- CreateIndex
CREATE INDEX "UsoIA_doctorId_createdAt_idx" ON "UsoIA"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "UsoIA_createdAt_idx" ON "UsoIA"("createdAt");

-- AddForeignKey
ALTER TABLE "UsoIA" ADD CONSTRAINT "UsoIA_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
