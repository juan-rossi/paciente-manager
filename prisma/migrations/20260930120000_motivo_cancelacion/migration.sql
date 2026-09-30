-- AlterTable
ALTER TABLE "User" ADD COLUMN     "cancelacionDetalle" TEXT,
ADD COLUMN     "cancelacionMotivo" TEXT,
ADD COLUMN     "canceladaEl" TIMESTAMP(3);
