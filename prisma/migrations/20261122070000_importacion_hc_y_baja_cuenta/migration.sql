-- Acuerdo de tratamiento de datos: importación de HC por el equipo (archivos
-- temporales con permiso de acceso) y baja de cuenta con plazo para descargar.
-- CreateEnum
CREATE TYPE "ImportacionEstado" AS ENUM ('BORRADOR', 'ENVIADA', 'CARGADA', 'CONFIRMADA', 'CANCELADA', 'VENCIDA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAccion" ADD VALUE 'DESCARGAR';
ALTER TYPE "AuditAccion" ADD VALUE 'AUTORIZAR_ACCESO';
ALTER TYPE "AuditAccion" ADD VALUE 'REVOCAR_ACCESO';

-- AlterEnum
ALTER TYPE "AuditEntidad" ADD VALUE 'IMPORTACION';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "acuerdoDatosAceptadoAt" TIMESTAMP(3),
ADD COLUMN     "acuerdoDatosVersion" TEXT,
ADD COLUMN     "bajaAt" TIMESTAMP(3),
ADD COLUMN     "eliminadaAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ImportacionHC" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "estado" "ImportacionEstado" NOT NULL DEFAULT 'BORRADOR',
    "nota" TEXT,
    "acuerdoVersion" TEXT NOT NULL,
    "aceptadoAt" TIMESTAMP(3) NOT NULL,
    "aceptadoIp" TEXT,
    "accesoHasta" TIMESTAMP(3),
    "enviadaAt" TIMESTAMP(3),
    "archivosBorradosAt" TIMESTAMP(3),
    "cargadaAt" TIMESTAMP(3),
    "notaEquipo" TEXT,
    "confirmadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportacionHC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacionArchivo" (
    "id" TEXT NOT NULL,
    "importacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "datos" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacionArchivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportacionHC_doctorId_createdAt_idx" ON "ImportacionHC"("doctorId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportacionHC_estado_createdAt_idx" ON "ImportacionHC"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "ImportacionArchivo_importacionId_idx" ON "ImportacionArchivo"("importacionId");

-- AddForeignKey
ALTER TABLE "ImportacionHC" ADD CONSTRAINT "ImportacionHC_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacionArchivo" ADD CONSTRAINT "ImportacionArchivo_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "ImportacionHC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

