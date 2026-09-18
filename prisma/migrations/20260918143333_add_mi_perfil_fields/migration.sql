-- CreateEnum
CREATE TYPE "AtencionTipo" AS ENUM ('PARTICULAR', 'CONSULTORIO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "atencionTipo" "AtencionTipo",
ADD COLUMN     "biografia" TEXT,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "fotoPerfilBase64" TEXT,
ADD COLUMN     "nombreConsultorio" TEXT,
ADD COLUMN     "perfilPublico" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicSlug" TEXT,
ADD COLUMN     "reservaPublicaHabilitada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telefono" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_publicSlug_key" ON "User"("publicSlug");
