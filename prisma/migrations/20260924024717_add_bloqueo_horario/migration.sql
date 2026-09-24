-- CreateTable
CREATE TABLE "BloqueoHorario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lugarId" TEXT,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "motivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BloqueoHorario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BloqueoHorario_userId_inicio_idx" ON "BloqueoHorario"("userId", "inicio");

-- CreateIndex
CREATE INDEX "BloqueoHorario_lugarId_idx" ON "BloqueoHorario"("lugarId");

-- AddForeignKey
ALTER TABLE "BloqueoHorario" ADD CONSTRAINT "BloqueoHorario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloqueoHorario" ADD CONSTRAINT "BloqueoHorario_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "LugarDeTrabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
