-- CreateEnum
CREATE TYPE "AuditAccion" AS ENUM ('CREAR', 'MODIFICAR', 'ELIMINAR', 'RESTAURAR');

-- CreateEnum
CREATE TYPE "AuditEntidad" AS ENUM ('PACIENTE', 'EVOLUCION');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "accion" "AuditAccion" NOT NULL,
    "entidad" "AuditEntidad" NOT NULL,
    "entidadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_doctorId_entidad_entidadId_idx" ON "AuditLog"("doctorId", "entidad", "entidadId");

-- CreateIndex
CREATE INDEX "AuditLog_doctorId_createdAt_idx" ON "AuditLog"("doctorId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
