-- Cambio del email propio confirmado con un link al email nuevo (ver
-- src/lib/cambio-email.ts).
-- CreateTable
CREATE TABLE "CambioEmail" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailNuevo" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CambioEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CambioEmail_tokenHash_key" ON "CambioEmail"("tokenHash");

-- CreateIndex
CREATE INDEX "CambioEmail_userId_idx" ON "CambioEmail"("userId");

-- AddForeignKey
ALTER TABLE "CambioEmail" ADD CONSTRAINT "CambioEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
