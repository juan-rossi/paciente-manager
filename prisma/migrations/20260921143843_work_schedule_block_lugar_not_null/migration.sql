-- Todo horario de trabajo tiene que pertenecer a un lugar -- nunca más
-- "Horario general". Antes de "Mi práctica" podían quedar bloques con
-- `lugarId` null.
--
-- Paso 1: si algún doctor con bloques huérfanos no tiene NINGÚN lugar
-- cargado todavía (ni siquiera dado de baja), se le crea uno PARTICULAR
-- placeholder (mismo criterio que tenía scripts/backfill-lugar-particular.ts,
-- ahora reemplazado por esta migración) -- dirección/teléfono son solo
-- para no dejar esos campos obligatorios vacíos, el médico los reemplaza
-- después desde "Mi práctica".
INSERT INTO "LugarDeTrabajo" (id, "userId", tipo, direccion, telefono, "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  huerfanos."userId",
  'PARTICULAR',
  (ARRAY['Av. Corrientes 1234, CABA', 'Av. Santa Fe 2345, CABA', 'Av. Rivadavia 3456, CABA', 'Av. Cabildo 4567, CABA', 'Av. Callao 567, CABA', 'Av. Las Heras 890, CABA'])[floor(random() * 6 + 1)],
  '+54 9 11 ' || floor(random() * 9000 + 1000)::int || '-' || floor(random() * 9000 + 1000)::int,
  now(),
  now()
FROM (SELECT DISTINCT "userId" FROM "WorkScheduleBlock" WHERE "lugarId" IS NULL) huerfanos
WHERE NOT EXISTS (
  SELECT 1 FROM "LugarDeTrabajo" l WHERE l."userId" = huerfanos."userId"
);

-- Paso 2: backfillear todos los bloques con lugarId null -- para este
-- punto todo doctor con bloques huérfanos ya tiene al menos un lugar
-- (el que ya tenía, o el que se acaba de crear arriba). Se prefiere uno
-- activo (no dado de baja) y, entre esos, el más antiguo.
UPDATE "WorkScheduleBlock" bl
SET "lugarId" = (
  SELECT l.id
  FROM "LugarDeTrabajo" l
  WHERE l."userId" = bl."userId"
  ORDER BY (l."deletedAt" IS NOT NULL), l."createdAt" ASC
  LIMIT 1
)
WHERE bl."lugarId" IS NULL;

-- AlterTable
ALTER TABLE "WorkScheduleBlock" ALTER COLUMN "lugarId" SET NOT NULL;
