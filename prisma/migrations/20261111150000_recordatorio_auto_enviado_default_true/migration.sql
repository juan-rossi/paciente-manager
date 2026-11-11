-- AlterTable
-- Solo cambia el default para cuentas nuevas; las filas existentes mantienen su valor.
ALTER TABLE "User" ALTER COLUMN "recordatorioAutoEnviado" SET DEFAULT true;
