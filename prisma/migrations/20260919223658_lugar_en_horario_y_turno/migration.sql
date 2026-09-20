-- AlterTable
ALTER TABLE "LugarDeTrabajo" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN     "lugarId" TEXT;

-- AlterTable
ALTER TABLE "WorkScheduleBlock" ADD COLUMN     "lugarId" TEXT;

-- CreateIndex
CREATE INDEX "Turno_lugarId_idx" ON "Turno"("lugarId");

-- CreateIndex
CREATE INDEX "WorkScheduleBlock_lugarId_idx" ON "WorkScheduleBlock"("lugarId");

-- AddForeignKey
ALTER TABLE "WorkScheduleBlock" ADD CONSTRAINT "WorkScheduleBlock_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "LugarDeTrabajo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "LugarDeTrabajo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
