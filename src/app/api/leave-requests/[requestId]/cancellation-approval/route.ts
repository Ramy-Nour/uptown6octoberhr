// File: src/app/api/leave-requests/[requestId]/cancellation-approval/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { action, reason } = await req.json(); // Now accepts a reason
    const { requestId } = params;

    const managerProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
    });

    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { 
        employee: { 
          include: { 
            workSchedule: true,
            manager: true
          } 
        } 
      },
    });

    if (!leaveRequest || !managerProfile) {
      return new NextResponse("Request or manager profile not found", { status: 404 });
    }
    if (leaveRequest.employee.managerId !== managerProfile.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    if (leaveRequest.status !== 'CANCELLATION_REQUESTED') {
      return new NextResponse("Request is not awaiting cancellation approval", { status: 400 });
    }

    if (action === 'REJECT') {
      // If rejected, revert the status back to approved and store the reason
      await db.leaveRequest.update({
        where: { id: requestId },
        data: { 
          status: 'APPROVED_BY_ADMIN',
          cancellationReason: reason ? `Cancellation rejected by manager: ${reason}` : 'Cancellation rejected by manager'
        },
      });
    } else if (action === 'APPROVE') {
      // If approved, recalculate working days and add them back to the balance
      const start = new Date(leaveRequest.startDate);
      const end = new Date(leaveRequest.endDate);
      
      let workSchedule = leaveRequest.employee.workSchedule;
      if (!workSchedule) {
        workSchedule = await db.workSchedule.findFirst({ where: { isDefault: true } });
      }
      if (!workSchedule) throw new Error("No default work schedule found.");

      const holidays = await db.holiday.findMany({ 
        where: { 
          date: { 
            gte: new Date(start.getFullYear(), 0, 1), 
            lte: new Date(start.getFullYear(), 11, 31) 
          } 
        } 
      });
      const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));
      
      let workingDaysToRestore = 0;
      let currentDate = new Date(start);
      const weekendMap = [!workSchedule.isSunday, !workSchedule.isMonday, !workSchedule.isTuesday, !workSchedule.isWednesday, !workSchedule.isThursday, !workSchedule.isFriday, !workSchedule.isSaturday];

      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        const dateString = currentDate.toISOString().split('T')[0];
        if (!weekendMap[dayOfWeek] && !holidayDates.has(dateString)) {
            workingDaysToRestore++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const balance = await db.leaveBalance.findFirst({
        where: { 
          employeeId: leaveRequest.employeeId, 
          leaveTypeId: leaveRequest.leaveTypeId, 
          year: start.getFullYear() 
        }
      });

      if (!balance) throw new Error("Could not find balance to restore days to.");

      // Use a transaction to ensure both actions succeed or fail together
      await db.$transaction([
        db.leaveRequest.update({
          where: { id: requestId },
          data: { 
            status: 'CANCELLED',
            cancelledById: session.user.id,
            cancelledAt: new Date(),
            cancellationReason: 'Cancellation approved by manager.',
          }
        }),
        db.leaveBalance.update({
          where: { id: balance.id },
          data: { remaining: { increment: workingDaysToRestore } }
        })
      ]);
    }

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error("[CANCELLATION_APPROVAL_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}