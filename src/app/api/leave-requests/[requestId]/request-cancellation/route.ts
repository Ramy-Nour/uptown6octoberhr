// File: src/app/api/leave-requests/[id]/request-cancellation/route.ts

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

    // 🛡️ SECURITY CHECK 2: Only allow this for fully approved requests
    if (leaveRequest.status !== 'APPROVED_BY_ADMIN') {
      return new NextResponse(`This action is only for fully approved requests. Status is currently '${leaveRequest.status}'`, { status: 400 });
    }
    
    // Update the request status
    const updatedRequest = await db.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLATION_REQUESTED',
      },
    });

    return NextResponse.json(updatedRequest);

  } catch (error) {
    console.error("[LEAVE_REQUEST_CANCELLATION_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}