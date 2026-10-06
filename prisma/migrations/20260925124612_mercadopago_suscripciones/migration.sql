-- CreateEnum
CREATE TYPE "MpPreapprovalStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAUSED', 'CANCELLED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "graciaVenceEl" TIMESTAMP(3),
ADD COLUMN     "mpPreapprovalId" TEXT,
ADD COLUMN     "mpPreapprovalStatus" "MpPreapprovalStatus",
ADD COLUMN     "pagoEnGracia" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PagoSuscripcion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mpPaymentId" TEXT NOT NULL,
    "mpPreapprovalId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "estado" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoSuscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PagoSuscripcion_mpPaymentId_key" ON "PagoSuscripcion"("mpPaymentId");

-- CreateIndex
CREATE INDEX "PagoSuscripcion_userId_createdAt_idx" ON "PagoSuscripcion"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_mpPreapprovalId_key" ON "User"("mpPreapprovalId");

-- AddForeignKey
ALTER TABLE "PagoSuscripcion" ADD CONSTRAINT "PagoSuscripcion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

