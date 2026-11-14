-- CreateTable
CREATE TABLE "PacienteVisto" (
    "userId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "vistoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PacienteVisto_pkey" PRIMARY KEY ("userId","patientId")
);

-- CreateIndex
CREATE INDEX "PacienteVisto_userId_vistoAt_idx" ON "PacienteVisto"("userId", "vistoAt");

-- AddForeignKey
ALTER TABLE "PacienteVisto" ADD CONSTRAINT "PacienteVisto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PacienteVisto" ADD CONSTRAINT "PacienteVisto_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
