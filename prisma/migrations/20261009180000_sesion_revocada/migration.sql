-- CreateTable
CREATE TABLE "SesionRevocada" (
    "sid" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SesionRevocada_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "SesionRevocada_expiresAt_idx" ON "SesionRevocada"("expiresAt");
