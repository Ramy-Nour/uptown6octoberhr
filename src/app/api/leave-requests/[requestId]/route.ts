// File: src/app/api/leave-requests/[id]/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions);
  const sessionUserRole = session?.user?.role;

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { status, denialReason } = await req.json();
    const { requestId } = params;

    const userProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!userProfile) {
      return new NextResponse("User profile not found", { status: 404 });
    }

    const leaveRequestToUpdate = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { 
        employee: { include: { workSchedule: true } }, 
        leaveType: true 
      }
    });

    if (!leaveRequestToUpdate) {
      return new NextResponse("Leave request not found", { status: 404 });
    }

    const isManagerOfEmployee = leaveRequestToUpdate.employee.managerId === userProfile.id;
    const isAdminOrSuperAdmin = sessionUserRole === 'ADMIN' || sessionUserRole === 'SUPER_ADMIN';

    if ((status === 'APPROVED_BY_MANAGER' || status === 'DENIED') && !isManagerOfEmployee && !isAdminOrSuperAdmin) {
      return new NextResponse("Forbidden: You are not the manager for this employee", { status: 403 });
    }
    if (status === 'APPROVED_BY_ADMIN' && !isAdminOrSuperAdmin) {
      return new NextResponse("Forbidden: Only Admins can give final approval", { status: 403 });
    }

    if (status === 'APPROVED_BY_MANAGER') {
      await db.leaveRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED_BY_MANAGER' }
      });
    } else if (status === 'DENIED') {
      await db.leaveRequest.update({
        where: { id: requestId },
        data: { 
          status: 'DENIED',
          denialReason: denialReason || "No reason provided"
        }
      });
    } else if (status === 'APPROVED_BY_ADMIN') {
      const start = new Date(leaveRequestToUpdate.startDate);
      const end = new Date(leaveRequestToUpdate.endDate);

      // --- START: Smart Day Calculation Logic ---
      let workSchedule = leaveRequestToUpdate.employee.workSchedule;
      if (!workSchedule) {
        workSchedule = await db.workSchedule.findFirst({ where: { isDefault: true } });
      }
      if (!workSchedule) {
        return new NextResponse("No default work schedule found.", { status: 500 });
      }

      const holidays = await db.holiday.findMany({
        where: { date: { gte: start, lte: end } },
      });
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
      // --- END: Smart Day Calculation Logic ---

      if (workingDaysRequested <= 0) {
        return new NextResponse("This request contains no working days to deduct.", { status: 400 });
      }
      
      const balance = await db.leaveBalance.findFirst({
        where: {
          employeeId: leaveRequestToUpdate.employeeId,
          leaveTypeId: leaveRequestToUpdate.leaveTypeId,
          year: start.getFullYear(),
        }
      });

      if (!balance || balance.remaining < workingDaysRequested) {
        return new NextResponse(`Employee has insufficient balance. Remaining: ${balance?.remaining || 0}, Required: ${workingDaysRequested}`, { status: 400 });
      }

      await db.$transaction([
        db.leaveRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED_BY_ADMIN', denialReason: null }
        }),
        db.leaveBalance.update({
          where: { id: balance.id },
          data: { remaining: { decrement: workingDaysRequested } } // Use the correct calculated days
        })
      ]);
    } else {
      return new NextResponse("Invalid status update", { status: 400 });
    }

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error("[LEAVE_REQUEST_PATCH_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}