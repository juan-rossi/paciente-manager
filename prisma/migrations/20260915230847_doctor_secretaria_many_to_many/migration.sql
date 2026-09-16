-- Reordenado a mano respecto de lo que generó Prisma: primero se crea la
-- tabla nueva y se migran los datos existentes, y solo al final se borra
-- `User.doctorId` -- el orden generado por Prisma lo borraba primero y
-- perdía la relación médico/secretaria de todos los usuarios existentes.

-- CreateTable
CREATE TABLE "DoctorSecretaria" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "secretariaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorSecretaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorSecretaria_secretariaId_idx" ON "DoctorSecretaria"("secretariaId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorSecretaria_doctorId_secretariaId_key" ON "DoctorSecretaria"("doctorId", "secretariaId");

-- AddForeignKey
ALTER TABLE "DoctorSecretaria" ADD CONSTRAINT "DoctorSecretaria_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSecretaria" ADD CONSTRAINT "DoctorSecretaria_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: agregamos la columna nueva antes de tocar la vieja.
ALTER TABLE "User" ADD COLUMN "activeDoctorId" TEXT;

-- Backfill: cada secretaria existente tenía exactamente un médico
-- (`doctorId`) -- se migra a la tabla nueva y queda como su médico activo,
-- sin cambiar el comportamiento de nadie.
INSERT INTO "DoctorSecretaria" ("id", "doctorId", "secretariaId")
SELECT gen_random_uuid()::text, "doctorId", "id"
FROM "User"
WHERE "role" = 'SECRETARY' AND "doctorId" IS NOT NULL;

UPDATE "User"
SET "activeDoctorId" = "doctorId"
WHERE "role" = 'SECRETARY' AND "doctorId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_doctorId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "doctorId";
