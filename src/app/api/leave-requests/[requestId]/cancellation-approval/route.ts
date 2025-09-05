// File: src/app/api/leave-requests/[requestId]/cancellation-approval/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/prisma';
import { Role } from '@prisma/client';

// Helper function to restore leave balance
async function restoreLeaveBalance(leaveRequest: any) {
  // This function is simplified and assumes the leave request object is passed in.
  // In a real scenario, you might need to re-fetch some of this data.
  const start = new Date(leaveRequest.startDate);
  const end = new Date(leaveRequest.endDate);

  let workSchedule = leaveRequest.employee.workSchedule;
  if (!workSchedule) {
    workSchedule = await db.workSchedule.findFirst({ where: { isDefault: true } });
  }
  if (!workSchedule) throw new Error("No default work schedule found to calculate days to restore.");

  const holidays = await db.holiday.findMany({
    where: { date: { gte: start, lte: end } }
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

  if (workingDaysToRestore > 0) {
    const balance = await db.leaveBalance.findFirst({
      where: {
        employeeId: leaveRequest.employeeId,
        leaveTypeId: leaveRequest.leaveTypeId,
        year: start.getFullYear()
      }
    });

    if (balance) {
      await db.leaveBalance.update({
        where: { id: balance.id },
        data: { remaining: { increment: workingDaysToRestore } }
      });
    } else {
        throw new Error(`Could not find leave balance for employee ${leaveRequest.employeeId} to restore days to.`);
    }
  }
}


export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { action, reason } = await req.json();
    if (!['APPROVE', 'REJECT'].includes(action)) {
      return new NextResponse("Invalid action.", { status: 400 });
    }

    const { requestId } = params;
    const approverId = session.user.id;

    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: { include: { manager: true, workSchedule: true } } },
    });

    if (!leaveRequest) {
      return new NextResponse("Leave request not found", { status: 404 });
    }

    // @ts-ignore - 'statusBeforeCancellation' does not exist on type. This is a placeholder.
    const originalStatus = leaveRequest.statusBeforeCancellation || 'APPROVED_BY_ADMIN';

    const approverUser = await db.user.findUnique({ where: { id: approverId }});
    if (!approverUser) {
        return new NextResponse("Approver not found", { status: 404 });
    }

    const isManager = leaveRequest.employee.managerId === approverUser.profile?.id;
    const isAdmin = approverUser.role === Role.ADMIN || approverUser.role === Role.SUPER_ADMIN;

    // --- Authorization ---
    // @ts-ignore - Enum values don't exist yet.
    if (leaveRequest.status === 'CANCELLATION_PENDING_MANAGER' && !isManager) {
        return new NextResponse("Forbidden: Only the direct manager can perform this action.", { status: 403 });
    }
    // @ts-ignore - Enum values don't exist yet.
    if (leaveRequest.status === 'CANCELLATION_PENDING_ADMIN' && !isAdmin) {
        return new NextResponse("Forbidden: Only an admin can perform this action.", { status: 403 });
    }

    // --- State Machine Logic ---
    let finalStatus: any;
    let cancellationResponseMessage: string = "";

    if (action === 'REJECT') {
      finalStatus = originalStatus; // Revert to the status before cancellation was requested
      cancellationResponseMessage = `Cancellation request denied by ${isAdmin ? 'admin' : 'manager'}. Reason: ${reason || 'No reason provided.'}`;
    } else { // APPROVE
      // @ts-ignore
      if (leaveRequest.status === 'CANCELLATION_PENDING_MANAGER') {
        // If manager approves, it might go to admin or be fully cancelled.
        if (originalStatus === 'APPROVED_BY_ADMIN') {
          // @ts-ignore
          finalStatus = 'CANCELLATION_PENDING_ADMIN'; // Now needs admin approval
          cancellationResponseMessage = 'Cancellation approved by manager, pending admin approval.';
        } else {
          finalStatus = 'CANCELLED'; // Approved by manager, was not admin-approved before.
          cancellationResponseMessage = 'Cancellation approved by manager.';
        }
      // @ts-ignore
      } else if (leaveRequest.status === 'CANCELLATION_PENDING_ADMIN') {
        finalStatus = 'CANCELLED'; // Final approval from admin
        cancellationResponseMessage = 'Cancellation approved by admin.';
      } else {
        return new NextResponse("Request is not in a valid state for cancellation approval.", { status: 400 });
      }
    }

    // --- Database Update ---
    await db.$transaction(async (tx) => {
        const updateData: any = {
            status: finalStatus,
            cancellationReason: cancellationResponseMessage,
        };

        if (finalStatus === 'CANCELLED') {
            updateData.cancelledById = approverId;
            updateData.cancelledAt = new Date();
            // In a real transaction, pass the leave request data to avoid re-fetching
            await restoreLeaveBalance(leaveRequest);
        }

        await tx.leaveRequest.update({
            where: { id: requestId },
            data: updateData,
        });
    });

    return new NextResponse("Action completed successfully.", { status: 200 });

  } catch (error) {
    console.error("[CANCELLATION_APPROVAL_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}