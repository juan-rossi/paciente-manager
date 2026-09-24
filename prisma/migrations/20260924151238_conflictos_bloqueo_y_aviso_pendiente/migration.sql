-- CreateEnum
CREATE TYPE "TurnoAvisoPendienteMotivo" AS ENUM ('CANCELADO', 'APLAZADO');

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "avisoPendiente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "avisoPendienteFechaAnterior" TIMESTAMP(3),
ADD COLUMN     "avisoPendienteMotivo" "TurnoAvisoPendienteMotivo";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mensajeTemplateAplazado" TEXT NOT NULL DEFAULT 'Hola {nombre}, tu turno del {fecha} a las {hora}hs fue reprogramado para el {nueva_fecha}. Cualquier consulta, respondé este mensaje.',
ADD COLUMN     "mensajeTemplateCancelado" TEXT NOT NULL DEFAULT 'Hola {nombre}, lamentablemente tu turno del {fecha} a las {hora}hs fue cancelado. Te contactaremos para reprogramarlo.';

-- CreateIndex
CREATE INDEX "Turno_doctorId_avisoPendiente_idx" ON "Turno"("doctorId", "avisoPendiente");
