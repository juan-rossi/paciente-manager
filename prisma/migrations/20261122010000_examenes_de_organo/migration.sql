-- AlterEnum: antecedentes de oftalmología, ORL y dermatología
ALTER TYPE "TipoAntecedente" ADD VALUE 'USO_ANTEOJOS_LENTES';
ALTER TYPE "TipoAntecedente" ADD VALUE 'GLAUCOMA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'CIRUGIA_OCULAR';
ALTER TYPE "TipoAntecedente" ADD VALUE 'TRAUMATISMO_OCULAR';
ALTER TYPE "TipoAntecedente" ADD VALUE 'GLAUCOMA_FAMILIAR';
ALTER TYPE "TipoAntecedente" ADD VALUE 'ENFERMEDADES_AUTOINMUNES';
ALTER TYPE "TipoAntecedente" ADD VALUE 'CORTICOIDES';
ALTER TYPE "TipoAntecedente" ADD VALUE 'ACUFENOS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'VERTIGO';
ALTER TYPE "TipoAntecedente" ADD VALUE 'CIRUGIAS_ORL';
ALTER TYPE "TipoAntecedente" ADD VALUE 'RINOSINUSITIS_CRONICA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'RONQUIDO_APNEAS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'EXPOSICION_RUIDO';
ALTER TYPE "TipoAntecedente" ADD VALUE 'DERMATITIS_ATOPICA';
ALTER TYPE "TipoAntecedente" ADD VALUE 'PSORIASIS';
ALTER TYPE "TipoAntecedente" ADD VALUE 'EXPOSICION_SOLAR';
ALTER TYPE "TipoAntecedente" ADD VALUE 'CANCER_PIEL';
ALTER TYPE "TipoAntecedente" ADD VALUE 'INMUNOSUPRESION';
ALTER TYPE "TipoAntecedente" ADD VALUE 'TRATAMIENTOS_DERMATOLOGICOS_PREVIOS';

-- AlterTable: exámenes de órgano (en lugar del examen físico)
ALTER TABLE "Patient" ADD COLUMN "ofAvScOd" TEXT,
ADD COLUMN "ofAvScOi" TEXT,
ADD COLUMN "ofAvCcOd" TEXT,
ADD COLUMN "ofAvCcOi" TEXT,
ADD COLUMN "ofRefraccionOd" TEXT,
ADD COLUMN "ofRefraccionOi" TEXT,
ADD COLUMN "ofPioOd" TEXT,
ADD COLUMN "ofPioOi" TEXT,
ADD COLUMN "ofBiomicroscopiaOd" TEXT,
ADD COLUMN "ofBiomicroscopiaOi" TEXT,
ADD COLUMN "ofFondoOjoOd" TEXT,
ADD COLUMN "ofFondoOjoOi" TEXT,
ADD COLUMN "ofMotilidad" TEXT,
ADD COLUMN "ofPupilas" TEXT,
ADD COLUMN "orlOtoscopiaOd" TEXT,
ADD COLUMN "orlOtoscopiaOi" TEXT,
ADD COLUMN "orlRinoscopia" TEXT,
ADD COLUMN "orlOrofaringe" TEXT,
ADD COLUMN "orlLaringoscopia" TEXT,
ADD COLUMN "orlCuello" TEXT,
ADD COLUMN "orlAcumetria" TEXT,
ADD COLUMN "orlAudiometria" TEXT,
ADD COLUMN "orlVestibular" TEXT,
ADD COLUMN "dermFototipo" TEXT,
ADD COLUMN "dermLesiones" TEXT,
ADD COLUMN "dermLocalizacion" TEXT,
ADD COLUMN "dermDescripcion" TEXT,
ADD COLUMN "dermDermatoscopia" TEXT,
ADD COLUMN "dermFaneras" TEXT,
ADD COLUMN "dermMucosas" TEXT;

-- AlterTable: presión intraocular en los controles
ALTER TABLE "PatientControl" ADD COLUMN "pioOd" DOUBLE PRECISION,
ADD COLUMN "pioOi" DOUBLE PRECISION;
