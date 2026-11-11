-- CreateEnum
CREATE TYPE "TicketTipo" AS ENUM ('SUGERENCIA', 'PROBLEMA', 'OTRO');

-- CreateEnum
CREATE TYPE "TicketEstado" AS ENUM ('NUEVO', 'EN_REVISION', 'PLANIFICADO', 'RESUELTO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "TicketSoporte" (
    "id" TEXT NOT NULL,
    "tipo" "TicketTipo" NOT NULL,
    "estado" "TicketEstado" NOT NULL DEFAULT 'NUEVO',
    "asunto" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "doctorId" TEXT,
    "pantalla" TEXT,
    "userAgent" TEXT,
    "noLeidoAutor" BOOLEAN NOT NULL DEFAULT false,
    "noLeidoAdmin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSoporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketMensaje" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "esEquipo" BOOLEAN NOT NULL DEFAULT false,
    "interno" BOOLEAN NOT NULL DEFAULT false,
    "cuerpo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketMensaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketSoporte_autorId_updatedAt_idx" ON "TicketSoporte"("autorId", "updatedAt");

-- CreateIndex
CREATE INDEX "TicketSoporte_estado_updatedAt_idx" ON "TicketSoporte"("estado", "updatedAt");

-- CreateIndex
CREATE INDEX "TicketMensaje_ticketId_createdAt_idx" ON "TicketMensaje"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "TicketSoporte" ADD CONSTRAINT "TicketSoporte_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSoporte" ADD CONSTRAINT "TicketSoporte_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMensaje" ADD CONSTRAINT "TicketMensaje_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "TicketSoporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketMensaje" ADD CONSTRAINT "TicketMensaje_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

