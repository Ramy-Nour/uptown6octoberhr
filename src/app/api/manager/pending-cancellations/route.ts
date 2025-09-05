// File: src/app/api/manager/pending-cancellations/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  try {
    const userProfile = await db.employeeProfile.findUnique({
        where: { userId: session.user.id }
    });
    if (!userProfile) {
        return NextResponse.json([]);
    }

    // NEW LOG: Let's see the exact ID the API is using for the manager.
    console.log(`[Cancellations API] Logged-in manager's Profile ID is: ${userProfile.id}`);

    const pendingCancellations = await db.leaveRequest.findMany({
        where: {
            status: 'CANCELLATION_REQUESTED',
            employee: {
                managerId: userProfile.id
            },
        },
        include: {
            employee: { select: { firstName: true, lastName: true, } },
            leaveType: { select: { name: true, } }
        },
        orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(pendingCancellations);
  } catch (error) {
    console.error("[MANAGER_PENDING_CANCELLATIONS_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}