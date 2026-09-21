-- CreateEnum
CREATE TYPE "TurnoOrigen" AS ENUM ('PANEL', 'ONLINE');

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "origen" "TurnoOrigen" NOT NULL DEFAULT 'PANEL';
