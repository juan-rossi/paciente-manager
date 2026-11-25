-- AlterTable
ALTER TABLE "User" ADD COLUMN "mensajeTemplateVirtual" TEXT NOT NULL DEFAULT 'Hola {nombre}, te recordamos tu teleconsulta para {fecha} a las {hora}hs. A esa hora entrá a la videollamada desde acá: {videollamada}';
