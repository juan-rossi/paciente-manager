-- AlterTable
ALTER TABLE "User" ALTER COLUMN "mensajeTemplateAplazado" SET DEFAULT 'Hola {nombre}, tu turno para {fecha} a las {hora}hs fue reprogramado para {nueva_fecha}. Cualquier consulta, respondé este mensaje.',
ALTER COLUMN "mensajeTemplateCancelado" SET DEFAULT 'Hola {nombre}, lamentablemente tu turno para {fecha} a las {hora}hs fue cancelado. Te contactaremos para reprogramarlo.';
