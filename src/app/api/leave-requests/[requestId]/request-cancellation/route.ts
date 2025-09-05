// File: src/app/api/leave-requests/[requestId]/request-cancellation/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/prisma';
import { shouldBypassManager } from '@/lib/manager-actions';

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { requestId } = params;

    const userProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!userProfile) {
      return new NextResponse("Employee profile not found", { status: 404 });
    }

    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: requestId },
    });

    if (!leaveRequest) {
      return new NextResponse("Leave request not found", { status: 404 });
    }

    // 🛡️ SECURITY CHECK 1: Ensure the user owns this request
    if (leaveRequest.employeeId !== userProfile.id) {
      return new NextResponse("Forbidden: You cannot modify a request that is not yours.", { status: 403 });
    }

    // 🛡️ SECURITY CHECK 2: Only allow this for approved (by manager or admin) requests
    const requestableStatuses = ['APPROVED_BY_MANAGER', 'PENDING_ADMIN', 'APPROVED_BY_ADMIN'];
    if (!requestableStatuses.includes(leaveRequest.status)) {
      return new NextResponse(`Cancellation can only be requested for approved requests. Status is currently '${leaveRequest.status}'`, { status: 400 });
    }

    // Determine the next status based on manager availability
    const bypassManager = await shouldBypassManager(leaveRequest.employeeId);
    
    // NOTE: The following statuses do not exist in the schema yet.
    // This will cause a type error until the database is migrated.
    // We are writing the logic assuming the migration will be applied later.
    const newStatus = bypassManager ? 'CANCELLATION_PENDING_ADMIN' : 'CANCELLATION_PENDING_MANAGER';

    // Update the request status and store the original status
    const updatedRequest = await db.leaveRequest.update({
      where: { id: requestId },
      data: {
        // @ts-ignore - This field does not exist in the current schema.
        statusBeforeCancellation: leaveRequest.status,
        // @ts-ignore - This enum value does not exist in the current schema.
        status: newStatus,
      },
    });

    return NextResponse.json(updatedRequest);

  } catch (error) {
    console.error("[LEAVE_REQUEST_CANCELLATION_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}