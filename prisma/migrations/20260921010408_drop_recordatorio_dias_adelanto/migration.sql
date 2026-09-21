-- AlterTable
ALTER TABLE "User" DROP COLUMN "recordatorioDiasAdelanto";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "mensajeTemplate" SET DEFAULT 'Hola {nombre}, te recordamos tu turno para {fecha} a las {hora}hs. Respondé este mensaje para confirmar tu asistencia. ¡Gracias!';
