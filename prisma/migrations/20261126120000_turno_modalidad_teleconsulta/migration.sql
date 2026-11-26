-- AlterEnum
ALTER TYPE "TurnoAvisoPendienteMotivo" ADD VALUE 'PASADO_A_TELECONSULTA';
ALTER TYPE "TurnoAvisoPendienteMotivo" ADD VALUE 'PASADO_A_PRESENCIAL';

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "teleconsulta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "modalidadCambiadaAt" TIMESTAMP(3),
ADD COLUMN "modalidadCambiadaPorId" TEXT;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_modalidadCambiadaPorId_fkey" FOREIGN KEY ("modalidadCambiadaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: hasta ahora "es teleconsulta" salía del tipo del lugar.
UPDATE "Turno" t
SET "teleconsulta" = true
FROM "LugarDeTrabajo" l
WHERE t."lugarId" = l."id" AND l."tipo" = 'VIRTUAL';
