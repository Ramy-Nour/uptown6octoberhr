import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let whereClause: any = {};

    if (employeeId && employeeId !== 'all') {
      whereClause.employeeId = employeeId;
    }

    if (startDate && endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setDate(endOfDay.getDate() + 1);
      whereClause.createdAt = {
        gte: new Date(startDate),
        lt: endOfDay,
      };
    }

    const leaveRequests = await db.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            user: {
              select: { email: true }
            }
          }
        },
        leaveType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(leaveRequests);

  } catch (error) {
    console.error("[REPORTS_LEAVE_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}