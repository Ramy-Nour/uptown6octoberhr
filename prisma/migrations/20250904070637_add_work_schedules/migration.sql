-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "workScheduleId" TEXT;

-- CreateTable
CREATE TABLE "WorkSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isMonday" BOOLEAN NOT NULL DEFAULT true,
    "isTuesday" BOOLEAN NOT NULL DEFAULT true,
    "isWednesday" BOOLEAN NOT NULL DEFAULT true,
    "isThursday" BOOLEAN NOT NULL DEFAULT true,
    "isFriday" BOOLEAN NOT NULL DEFAULT false,
    "isSaturday" BOOLEAN NOT NULL DEFAULT true,
    "isSunday" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkSchedule_name_key" ON "WorkSchedule"("name");

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_workScheduleId_fkey" FOREIGN KEY ("workScheduleId") REFERENCES "WorkSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
