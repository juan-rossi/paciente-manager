/*
  Warnings:

  - Made the column `telefono` on table `Turno` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill existing NULL values before enforcing NOT NULL
UPDATE "Turno" SET "telefono" = '' WHERE "telefono" IS NULL;

-- AlterTable
ALTER TABLE "Turno" ALTER COLUMN "telefono" SET NOT NULL;
