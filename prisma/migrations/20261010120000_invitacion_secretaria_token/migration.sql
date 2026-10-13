-- AlterTable
ALTER TABLE "DoctorSecretaria" ADD COLUMN "invitacionTokenHash" TEXT,
ADD COLUMN "invitacionExpiraAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorSecretaria_invitacionTokenHash_key" ON "DoctorSecretaria"("invitacionTokenHash");
