-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PatientEvolucion" ADD COLUMN     "deletedAt" TIMESTAMP(3);
