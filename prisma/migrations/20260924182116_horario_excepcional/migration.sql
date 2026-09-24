-- CreateTable
CREATE TABLE "HorarioExcepcional" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lugarId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HorarioExcepcional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HorarioExcepcional_userId_inicio_idx" ON "HorarioExcepcional"("userId", "inicio");

-- CreateIndex
CREATE INDEX "HorarioExcepcional_lugarId_idx" ON "HorarioExcepcional"("lugarId");

-- AddForeignKey
ALTER TABLE "HorarioExcepcional" ADD CONSTRAINT "HorarioExcepcional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HorarioExcepcional" ADD CONSTRAINT "HorarioExcepcional_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "LugarDeTrabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
