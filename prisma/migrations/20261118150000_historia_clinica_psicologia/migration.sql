-- AlterEnum: antecedentes de la historia clínica de psicología
ALTER TYPE "TipoAntecedente" ADD VALUE 'TRATAMIENTO_PSICOLOGICO_PREVIO';
ALTER TYPE "TipoAntecedente" ADD VALUE 'TRATAMIENTO_PSIQUIATRICO_PREVIO';
ALTER TYPE "TipoAntecedente" ADD VALUE 'MEDICACION_PSIQUIATRICA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'INTERNACIONES_PSIQUIATRICAS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'CONSUMO_SUSTANCIAS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'AUTOLESIONES';
ALTER TYPE "TipoAntecedente" ADD VALUE 'INTENTOS_SUICIDIO';
ALTER TYPE "TipoAntecedente" ADD VALUE 'SALUD_MENTAL_FAMILIAR';
ALTER TYPE "TipoAntecedente" ADD VALUE 'SITUACIONES_TRAUMATICAS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'ENFERMEDADES_MEDICAS';

-- AlterTable: campos propios de la historia clínica de psicología
ALTER TABLE "Patient" ADD COLUMN "derivadoPor" TEXT,
ADD COLUMN "expectativasTratamiento" TEXT,
ADD COLUMN "encuadre" TEXT,
ADD COLUMN "grupoFamiliar" TEXT,
ADD COLUMN "historiaVital" TEXT,
ADD COLUMN "enfoqueTerapeutico" TEXT;
