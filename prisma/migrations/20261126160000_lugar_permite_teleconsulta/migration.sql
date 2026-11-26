-- AlterTable
ALTER TABLE "LugarDeTrabajo" ADD COLUMN "permiteTeleconsulta" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: los lugares presenciales que ya tienen turnos pasados a
-- teleconsulta siguen permitiéndolo.
UPDATE "LugarDeTrabajo" l
SET "permiteTeleconsulta" = true
WHERE l."tipo" <> 'VIRTUAL' AND EXISTS (
  SELECT 1 FROM "Turno" t WHERE t."lugarId" = l."id" AND t."teleconsulta" = true
);
