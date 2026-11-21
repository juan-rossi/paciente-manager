-- AlterEnum: antecedentes de la historia clínica de nutrición
ALTER TYPE "TipoAntecedente" ADD VALUE 'ENFERMEDAD_CELIACA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'INTOLERANCIAS_ALIMENTARIAS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'TRASTORNOS_CONDUCTA_ALIMENTARIA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'CIRUGIA_BARIATRICA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'ENFERMEDADES_DIGESTIVAS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'ENFERMEDAD_RENAL';
ALTER TYPE "TipoAntecedente" ADD VALUE 'DIETAS_PREVIAS';

-- AlterTable: evaluación nutricional
ALTER TABLE "Patient" ADD COLUMN "circunferenciaCintura" TEXT,
ADD COLUMN "circunferenciaCadera" TEXT,
ADD COLUMN "porcentajeGrasa" TEXT,
ADD COLUMN "pesoObjetivo" TEXT,
ADD COLUMN "actividadFisica" TEXT,
ADD COLUMN "habitosAlimentarios" TEXT,
ADD COLUMN "recordatorio24h" TEXT;
