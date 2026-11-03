-- CreateEnum
CREATE TYPE "ModeracionCampo" AS ENUM ('BIOGRAFIA', 'FOTO');

-- CreateEnum
CREATE TYPE "ModeracionMotivo" AS ENUM ('MARCADO', 'API_NO_DISPONIBLE');

-- CreateEnum
CREATE TYPE "ModeracionEstado" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "biografiaPublica" TEXT,
ADD COLUMN     "fotoPublicaBase64" TEXT;

-- Lo que ya estaba publicado sigue publicado: se da por aprobado. La foto
-- también se ve en la agenda pública sin perfil público; la biografía no.
UPDATE "User" SET "biografiaPublica" = "biografia" WHERE "perfilPublico" = true;
UPDATE "User" SET "fotoPublicaBase64" = "fotoPerfilBase64"
WHERE "perfilPublico" = true OR "reservaPublicaHabilitada" = true;

-- CreateTable
CREATE TABLE "ModeracionPerfil" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campo" "ModeracionCampo" NOT NULL,
    "contenido" TEXT NOT NULL,
    "motivo" "ModeracionMotivo" NOT NULL,
    "categorias" TEXT[],
    "estado" "ModeracionEstado" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resueltaAt" TIMESTAMP(3),
    "resueltaPorId" TEXT,

    CONSTRAINT "ModeracionPerfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModeracionPerfil_estado_createdAt_idx" ON "ModeracionPerfil"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "ModeracionPerfil_userId_campo_idx" ON "ModeracionPerfil"("userId", "campo");

-- AddForeignKey
ALTER TABLE "ModeracionPerfil" ADD CONSTRAINT "ModeracionPerfil_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
