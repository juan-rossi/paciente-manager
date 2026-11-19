-- CreateEnum
CREATE TYPE "PresupuestoEstado" AS ENUM ('PENDIENTE', 'ACEPTADO', 'RECHAZADO');


-- AlterEnum
ALTER TYPE "AuditEntidad" ADD VALUE 'PRESUPUESTO';


-- CreateTable
CREATE TABLE "DoctorArancelPractica" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "practicaId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorArancelPractica_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "PresupuestoOdontologico" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "PresupuestoEstado" NOT NULL DEFAULT 'PENDIENTE',
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PresupuestoOdontologico_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "PresupuestoItem" (
    "id" TEXT NOT NULL,
    "presupuestoId" TEXT NOT NULL,
    "practicaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "pieza" TEXT,
    "caras" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "monto" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "PresupuestoItem_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "DoctorArancelPractica_doctorId_practicaId_key" ON "DoctorArancelPractica"("doctorId", "practicaId");


-- CreateIndex
CREATE INDEX "PresupuestoOdontologico_patientId_fecha_idx" ON "PresupuestoOdontologico"("patientId", "fecha");


-- CreateIndex
CREATE INDEX "PresupuestoItem_presupuestoId_idx" ON "PresupuestoItem"("presupuestoId");


-- AddForeignKey
ALTER TABLE "DoctorArancelPractica" ADD CONSTRAINT "DoctorArancelPractica_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "DoctorArancelPractica" ADD CONSTRAINT "DoctorArancelPractica_practicaId_fkey" FOREIGN KEY ("practicaId") REFERENCES "PracticaOdontologica"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "PresupuestoOdontologico" ADD CONSTRAINT "PresupuestoOdontologico_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "PresupuestoItem" ADD CONSTRAINT "PresupuestoItem_presupuestoId_fkey" FOREIGN KEY ("presupuestoId") REFERENCES "PresupuestoOdontologico"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "PresupuestoItem" ADD CONSTRAINT "PresupuestoItem_practicaId_fkey" FOREIGN KEY ("practicaId") REFERENCES "PracticaOdontologica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
