-- CreateEnum
CREATE TYPE "TituloCortesia" AS ENUM ('DR', 'DRA', 'LIC');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tituloCortesia" "TituloCortesia";
