-- CreateTable
CREATE TABLE "MarketingBienvenida" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "genero" "Sexo" NOT NULL,
    "publicadaPorId" TEXT,
    "publicadaAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingBienvenida_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingBienvenida_doctorId_key" ON "MarketingBienvenida"("doctorId");

-- AddForeignKey
ALTER TABLE "MarketingBienvenida" ADD CONSTRAINT "MarketingBienvenida_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
