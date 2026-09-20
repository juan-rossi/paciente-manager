-- CreateTable
CREATE TABLE "DoctorSecretariaLugar" (
    "id" TEXT NOT NULL,
    "doctorSecretariaId" TEXT NOT NULL,
    "lugarId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorSecretariaLugar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DoctorSecretariaLugar_lugarId_idx" ON "DoctorSecretariaLugar"("lugarId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorSecretariaLugar_doctorSecretariaId_lugarId_key" ON "DoctorSecretariaLugar"("doctorSecretariaId", "lugarId");

-- AddForeignKey
ALTER TABLE "DoctorSecretariaLugar" ADD CONSTRAINT "DoctorSecretariaLugar_doctorSecretariaId_fkey" FOREIGN KEY ("doctorSecretariaId") REFERENCES "DoctorSecretaria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSecretariaLugar" ADD CONSTRAINT "DoctorSecretariaLugar_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "LugarDeTrabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
