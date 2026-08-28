-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mensajeTemplate" TEXT NOT NULL DEFAULT 'Hola {nombre}, te recordamos tu turno para el {fecha} a las {hora}hs. Respondé este mensaje para confirmar tu asistencia. ¡Gracias!',
ADD COLUMN     "recordatorioDiasAdelanto" INTEGER NOT NULL DEFAULT 0;
