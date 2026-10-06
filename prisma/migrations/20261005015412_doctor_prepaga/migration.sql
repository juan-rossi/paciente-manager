-- CreateTable
CREATE TABLE "DoctorPrepaga" (
    "doctorId" TEXT NOT NULL,
    "prepagaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorPrepaga_pkey" PRIMARY KEY ("doctorId","prepagaId")
);

-- CreateIndex
CREATE INDEX "DoctorPrepaga_prepagaId_idx" ON "DoctorPrepaga"("prepagaId");

-- AddForeignKey
ALTER TABLE "DoctorPrepaga" ADD CONSTRAINT "DoctorPrepaga_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPrepaga" ADD CONSTRAINT "DoctorPrepaga_prepagaId_fkey" FOREIGN KEY ("prepagaId") REFERENCES "Prepaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;
