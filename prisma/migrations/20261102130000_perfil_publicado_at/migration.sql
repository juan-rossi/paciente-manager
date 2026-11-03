-- AlterTable
ALTER TABLE "User" ADD COLUMN     "perfilPublicadoAt" TIMESTAMP(3);

-- Los perfiles que ya están públicos cuentan como publicados, salvo los que
-- nunca mostraron nada aprobado y tienen la biografía o la foto actual
-- esperando revisión (o rechazada): esos quedan fuera hasta que se aprueben.
UPDATE "User" u
SET "perfilPublicadoAt" = NOW()
WHERE u."perfilPublico" = true
  AND (
    u."biografiaPublica" IS NOT NULL
    OR u."fotoPublicaBase64" IS NOT NULL
    OR NOT EXISTS (
      SELECT 1 FROM "ModeracionPerfil" m
      WHERE m."userId" = u."id"
        AND m."estado" IN ('PENDIENTE', 'RECHAZADA')
        AND (
          (m."campo" = 'BIOGRAFIA' AND m."contenido" = u."biografia")
          OR (m."campo" = 'FOTO' AND m."contenido" = u."fotoPerfilBase64")
        )
    )
  );
