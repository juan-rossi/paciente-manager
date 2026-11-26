-- AlterTable
ALTER TABLE "User" ADD COLUMN "mensajeTemplatePasoTeleconsulta" TEXT NOT NULL DEFAULT 'Hola {nombre}, te avisamos que tu turno para {fecha} a las {hora}hs va a ser por videollamada (teleconsulta). A esa hora entrá a la videollamada desde acá: {videollamada}

Confirmá tu asistencia: {confirmar}
Si no podés venir, cancelá acá: {cancelar}';
