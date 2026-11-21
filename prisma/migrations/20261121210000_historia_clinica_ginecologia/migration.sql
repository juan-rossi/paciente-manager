-- AlterEnum: antecedentes de la historia clínica de salud de la mujer
ALTER TYPE "TipoAntecedente" ADD VALUE 'COMPLICACIONES_OBSTETRICAS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'TRASTORNOS_MENSTRUALES';
ALTER TYPE "TipoAntecedente" ADD VALUE 'INFECCIONES_TRANSMISION_SEXUAL';
ALTER TYPE "TipoAntecedente" ADD VALUE 'PAP_ALTERADO';
ALTER TYPE "TipoAntecedente" ADD VALUE 'CIRUGIAS_GINECOLOGICAS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'CANCER_MAMA_OVARIO_FAMILIAR';
ALTER TYPE "TipoAntecedente" ADD VALUE 'TRATAMIENTO_HORMONAL';

-- AlterTable: antecedentes gineco-obstétricos
ALTER TABLE "Patient" ADD COLUMN "menarca" TEXT,
ADD COLUMN "ritmoMenstrual" TEXT,
ADD COLUMN "fum" TEXT,
ADD COLUMN "menopausia" TEXT,
ADD COLUMN "gestas" TEXT,
ADD COLUMN "partos" TEXT,
ADD COLUMN "cesareas" TEXT,
ADD COLUMN "abortos" TEXT,
ADD COLUMN "metodoAnticonceptivo" TEXT,
ADD COLUMN "ultimoPap" TEXT,
ADD COLUMN "ultimaMamografia" TEXT;
