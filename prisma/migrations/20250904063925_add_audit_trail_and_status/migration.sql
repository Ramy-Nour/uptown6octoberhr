-- AlterEnum
ALTER TYPE "LeaveStatus" ADD VALUE 'PENDING_ADMIN';

-- CreateTable
CREATE TABLE "LeaveRequestAudit" (
    "id" TEXT NOT NULL,
    "leaveRequestId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "previousStatus" "LeaveStatus" NOT NULL,
    "newStatus" "LeaveStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRequestAudit_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LeaveRequestAudit" ADD CONSTRAINT "LeaveRequestAudit_leaveRequestId_fkey" FOREIGN KEY ("leaveRequestId") REFERENCES "LeaveRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequestAudit" ADD CONSTRAINT "LeaveRequestAudit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
