-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TituloCortesia" ADD VALUE 'MED';
ALTER TYPE "TituloCortesia" ADD VALUE 'MED_SIN_TILDE';
ALTER TYPE "TituloCortesia" ADD VALUE 'ODONT';
ALTER TYPE "TituloCortesia" ADD VALUE 'OD';
ALTER TYPE "TituloCortesia" ADD VALUE 'PSIC';
ALTER TYPE "TituloCortesia" ADD VALUE 'PSI';
ALTER TYPE "TituloCortesia" ADD VALUE 'BIOQ';
ALTER TYPE "TituloCortesia" ADD VALUE 'BIOQCA';
ALTER TYPE "TituloCortesia" ADD VALUE 'KLGO';
ALTER TYPE "TituloCortesia" ADD VALUE 'KLGA';
ALTER TYPE "TituloCortesia" ADD VALUE 'ENF';
