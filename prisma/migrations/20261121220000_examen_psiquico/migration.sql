-- AlterTable: examen psíquico de la historia clínica de psiquiatría
ALTER TABLE "Patient" ADD COLUMN "epAspecto" TEXT,
ADD COLUMN "epConciencia" TEXT,
ADD COLUMN "epAtencionMemoria" TEXT,
ADD COLUMN "epPensamiento" TEXT,
ADD COLUMN "epSensopercepcion" TEXT,
ADD COLUMN "epAfectividad" TEXT,
ADD COLUMN "epPsicomotricidad" TEXT,
ADD COLUMN "epSuenoApetito" TEXT,
ADD COLUMN "epJuicio" TEXT;
