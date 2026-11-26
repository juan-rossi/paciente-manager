-- AlterTable
ALTER TABLE "User" ADD COLUMN "teleconsultaHabilitada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "teleconsultaPasarPresenciales" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "teleconsultaLugarVirtual" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: quien ya usaba teleconsulta (tiene un lugar VIRTUAL o algún
-- turno por videollamada) la sigue teniendo prendida.
UPDATE "User" u
SET "teleconsultaHabilitada" = true
WHERE EXISTS (
  SELECT 1 FROM "LugarDeTrabajo" l
  WHERE l."userId" = u."id" AND l."tipo" = 'VIRTUAL' AND l."deletedAt" IS NULL
) OR EXISTS (
  SELECT 1 FROM "Turno" t
  WHERE t."doctorId" = u."id" AND t."teleconsulta" = true
);
