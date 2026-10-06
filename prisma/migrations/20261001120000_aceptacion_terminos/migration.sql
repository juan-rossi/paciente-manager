-- AlterTable
ALTER TABLE "User" ADD COLUMN     "declaracionProfesionalAt" TIMESTAMP(3),
ADD COLUMN     "terminosAceptadosAt" TIMESTAMP(3),
ADD COLUMN     "terminosVersion" TEXT;
