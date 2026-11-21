-- AlterTable: controles propios de cada especialidad médica (LDL, TSH,
-- función renal, espirometría, HIV, PSA, Barthel)
ALTER TABLE "PatientControl" ADD COLUMN "ldl" DOUBLE PRECISION,
ADD COLUMN "tsh" DOUBLE PRECISION,
ADD COLUMN "creatinina" DOUBLE PRECISION,
ADD COLUMN "filtradoGlomerular" DOUBLE PRECISION,
ADD COLUMN "saturacion" DOUBLE PRECISION,
ADD COLUMN "vef1" DOUBLE PRECISION,
ADD COLUMN "cd4" DOUBLE PRECISION,
ADD COLUMN "cargaViral" DOUBLE PRECISION,
ADD COLUMN "psa" DOUBLE PRECISION,
ADD COLUMN "barthel" DOUBLE PRECISION;
