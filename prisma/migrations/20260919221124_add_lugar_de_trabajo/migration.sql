-- CreateEnum
CREATE TYPE "LugarTrabajoTipo" AS ENUM ('PARTICULAR', 'CONSULTORIO');

-- CreateTable
CREATE TABLE "LugarDeTrabajo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "LugarTrabajoTipo" NOT NULL,
    "nombre" TEXT,
    "direccion" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "telefono" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LugarDeTrabajo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LugarDeTrabajo_userId_idx" ON "LugarDeTrabajo"("userId");

-- AddForeignKey
ALTER TABLE "LugarDeTrabajo" ADD CONSTRAINT "LugarDeTrabajo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
