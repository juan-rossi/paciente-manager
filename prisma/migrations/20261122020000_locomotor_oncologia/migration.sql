-- AlterEnum: antecedentes de aparato locomotor y oncología
ALTER TYPE "TipoAntecedente" ADD VALUE 'TRAUMATISMOS_PREVIOS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'OSTEOPOROSIS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'ACTIVIDAD_DEPORTIVA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'QUIMIOTERAPIA_PREVIA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'RADIOTERAPIA_PREVIA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'CIRUGIA_ONCOLOGICA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'TRANSFUSIONES';
ALTER TYPE "TipoAntecedente" ADD VALUE 'DISPOSITIVO_ACCESO_VENOSO';

-- AlterTable: examen osteoarticular (en lugar del examen físico)
ALTER TABLE "Patient" ADD COLUMN "locEva" TEXT,
ADD COLUMN "locDolor" TEXT,
ADD COLUMN "locRegion" TEXT,
ADD COLUMN "locInspeccion" TEXT,
ADD COLUMN "locPalpacion" TEXT,
ADD COLUMN "locMovilidad" TEXT,
ADD COLUMN "locFuerza" TEXT,
ADD COLUMN "locManiobras" TEXT,
ADD COLUMN "locNeurovascular" TEXT,
ADD COLUMN "locMarcha" TEXT,
ADD COLUMN "locFuncional" TEXT,
ADD COLUMN "locArticulaciones" TEXT;

-- AlterTable: dolor (EVA), ECOG y hemograma en los controles
ALTER TABLE "PatientControl" ADD COLUMN "eva" DOUBLE PRECISION,
ADD COLUMN "ecog" DOUBLE PRECISION,
ADD COLUMN "hemoglobina" DOUBLE PRECISION,
ADD COLUMN "plaquetas" DOUBLE PRECISION,
ADD COLUMN "leucocitos" DOUBLE PRECISION;
