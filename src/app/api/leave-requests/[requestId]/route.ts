// File: src/app/api/leave-requests/[requestId]/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/prisma';
import { LeaveStatus } from '@prisma/client';

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { status, denialReason } = await req.json();
    const { requestId } = params;
    const newStatus = status as LeaveStatus;

    const leaveRequestToUpdate = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { 
        employee: { include: { workSchedule: true } }, 
      }
    });

    if (!leaveRequestToUpdate) {
      return NextResponse.json({ message: "Leave request not found" }, { status: 404 });
    }

    // Use a transaction to update the request and create an audit record
    await db.$transaction(async (prisma) => {
      // First, update the leave request itself
      await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: newStatus,
          denialReason: newStatus === 'DENIED' ? denialReason : null,
          deniedById: newStatus === 'DENIED' ? session.user.id : null,
          deniedAt: newStatus === 'DENIED' ? new Date() : null,
          approvedById: (newStatus === 'APPROVED_BY_MANAGER' || newStatus === 'APPROVED_BY_ADMIN') ? session.user.id : null,
          approvedAt: (newStatus === 'APPROVED_BY_MANAGER' || newStatus === 'APPROVED_BY_ADMIN') ? new Date() : null,
        }
      });

      // Second, create the audit trail record for this action
      await prisma.leaveRequestAudit.create({
        data: {
          leaveRequestId: requestId,
          changedById: session.user.id,
          previousStatus: leaveRequestToUpdate.status,
          newStatus: newStatus,
          reason: newStatus === 'DENIED' ? denialReason : `Request status updated by ${session.user.role?.toLowerCase()}`,
        }
      });

      // Third, if it's the FINAL admin approval, calculate working days and deduct from the balance
      if (newStatus === 'APPROVED_BY_ADMIN') {
        const start = new Date(leaveRequestToUpdate.startDate);
        const end = new Date(leaveRequestToUpdate.endDate);
        let workSchedule = leaveRequestToUpdate.employee.workSchedule || await prisma.workSchedule.findFirst({ where: { isDefault: true } });
        if (!workSchedule) throw new Error("No default work schedule found.");

        const holidays = await prisma.holiday.findMany({ where: { date: { gte: start, lte: end } } });
        const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));
        
        let workingDaysRequested = 0;
        let currentDate = new Date(start);
        const weekendMap = [!workSchedule.isSunday, !workSchedule.isMonday, !workSchedule.isTuesday, !workSchedule.isWednesday, !workSchedule.isThursday, !workSchedule.isFriday, !workSchedule.isSaturday];

        while (currentDate <= end) {
          const dayOfWeek = currentDate.getDay();
          const dateString = currentDate.toISOString().split('T')[0];
          if (!weekendMap[dayOfWeek] && !holidayDates.has(dateString)) {
            workingDaysRequested++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (workingDaysRequested > 0) {
          const balance = await prisma.leaveBalance.findFirst({
            where: { employeeId: leaveRequestToUpdate.employeeId, leaveTypeId: leaveRequestToUpdate.leaveTypeId, year: start.getFullYear() }
          });
          if (!balance) throw new Error("Could not find balance to deduct from.");
          await prisma.leaveBalance.update({
            where: { id: balance.id },
            data: { remaining: { decrement: workingDaysRequested } }
          });
        }
      }
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error("[LEAVE_REQUEST_PATCH_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}