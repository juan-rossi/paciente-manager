-- CreateTable
CREATE TABLE "IntentoReserva" (
    "id" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentoReserva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntentoReserva_ip_ruta_createdAt_idx" ON "IntentoReserva"("ip", "ruta", "createdAt");

-- CreateIndex
CREATE INDEX "IntentoReserva_slug_ruta_createdAt_idx" ON "IntentoReserva"("slug", "ruta", "createdAt");
