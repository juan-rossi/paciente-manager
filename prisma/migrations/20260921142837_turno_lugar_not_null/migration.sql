-- Todo turno tiene que tener un lugar asignado. Antes de "Mi práctica"
-- (y en la ventana entre esa feature y el backfill de lugares) podían
-- quedar turnos con `lugarId` null. Se los asigna al primer lugar del
-- doctor (preferentemente uno activo, no dado de baja) antes de exigir
-- la constraint NOT NULL -- si algún doctor con turnos no tiene ningún
-- lugar cargado, esta migración falla acá en vez de dejar filas huérfanas.
UPDATE "Turno" t
SET "lugarId" = (
  SELECT l.id
  FROM "LugarDeTrabajo" l
  WHERE l."userId" = t."doctorId"
  ORDER BY (l."deletedAt" IS NOT NULL), l."createdAt" ASC
  LIMIT 1
)
WHERE t."lugarId" IS NULL;

-- AlterTable
ALTER TABLE "Turno" ALTER COLUMN "lugarId" SET NOT NULL;
