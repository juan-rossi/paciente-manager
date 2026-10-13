-- AlterTable
ALTER TABLE "DoctorSecretaria" ADD COLUMN "aceptadaAt" TIMESTAMP(3);

-- Las asignaciones existentes ya estaban operativas: se dan por aceptadas.
UPDATE "DoctorSecretaria" SET "aceptadaAt" = "createdAt";
