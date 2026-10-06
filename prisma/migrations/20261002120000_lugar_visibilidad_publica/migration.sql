-- AlterTable
ALTER TABLE "LugarDeTrabajo" ADD COLUMN     "perfilVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "publicSlug" TEXT,
ADD COLUMN     "reservaPublicaHabilitada" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "LugarDeTrabajo_userId_publicSlug_key" ON "LugarDeTrabajo"("userId", "publicSlug");
