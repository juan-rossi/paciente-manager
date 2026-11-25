-- Las plantillas de recordatorio (presencial y teleconsulta) traen por
-- defecto los links de {confirmar}/{cancelar}.
ALTER TABLE "User" ALTER COLUMN "mensajeTemplate" SET DEFAULT 'Hola {nombre}, te recordamos tu turno para {fecha} a las {hora}hs. ¡Gracias!

Confirmá tu asistencia: {confirmar}
Si no podés venir, cancelá acá: {cancelar}';
ALTER TABLE "User" ALTER COLUMN "mensajeTemplateVirtual" SET DEFAULT 'Hola {nombre}, te recordamos tu teleconsulta para {fecha} a las {hora}hs. A esa hora entrá a la videollamada desde acá: {videollamada}

Confirmá tu asistencia: {confirmar}
Si no podés venir, cancelá acá: {cancelar}';

-- Quien nunca editó su plantilla (sigue con el default viejo, letra por
-- letra) pasa al nuevo. Las personalizadas no se tocan.
UPDATE "User" SET "mensajeTemplate" = 'Hola {nombre}, te recordamos tu turno para {fecha} a las {hora}hs. ¡Gracias!

Confirmá tu asistencia: {confirmar}
Si no podés venir, cancelá acá: {cancelar}' WHERE "mensajeTemplate" = 'Hola {nombre}, te recordamos tu turno para {fecha} a las {hora}hs. Respondé este mensaje para confirmar tu asistencia. ¡Gracias!';
UPDATE "User" SET "mensajeTemplateVirtual" = 'Hola {nombre}, te recordamos tu teleconsulta para {fecha} a las {hora}hs. A esa hora entrá a la videollamada desde acá: {videollamada}

Confirmá tu asistencia: {confirmar}
Si no podés venir, cancelá acá: {cancelar}' WHERE "mensajeTemplateVirtual" = 'Hola {nombre}, te recordamos tu teleconsulta para {fecha} a las {hora}hs. A esa hora entrá a la videollamada desde acá: {videollamada}';
