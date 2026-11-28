-- Mails automáticos de activación del trial (ver src/lib/engagement.ts).

-- CreateEnum
CREATE TYPE "MailEngagementTipo" AS ENUM ('CONFIGURAR_CONSULTORIO', 'PRIMER_PACIENTE', 'FUNDADOR', 'PRIMER_TURNO', 'PRIMER_DICTADO', 'SEGUIMIENTO', 'TRIAL_TERMINA_PRONTO', 'TRIAL_TERMINA_MANANA', 'TRIAL_VENCIDO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "recibeMailsEngagement" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "MailEngagement" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "tipo" "MailEngagementTipo" NOT NULL,
    "enviadoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailEngagement_tipo_enviadoAt_idx" ON "MailEngagement"("tipo", "enviadoAt");

-- CreateIndex
CREATE UNIQUE INDEX "MailEngagement_doctorId_tipo_key" ON "MailEngagement"("doctorId", "tipo");

-- AddForeignKey
ALTER TABLE "MailEngagement" ADD CONSTRAINT "MailEngagement_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
