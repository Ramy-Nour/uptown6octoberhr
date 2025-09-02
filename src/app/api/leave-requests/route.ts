import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";

// This new function fetches the leave request history for the logged-in user
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // This part reads the date filters from the URL
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    const employeeProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!employeeProfile) {
      return new NextResponse("Employee profile not found", { status: 404 });
    }
    
    let whereClause: any = {
        employeeId: employeeProfile.id
    };

    // If dates are provided, add them to the database query
    if (startDate && endDate) {
        // Add 1 day to the end date to include the whole day
        const endOfDay = new Date(endDate);
        endOfDay.setDate(endOfDay.getDate() + 1);

        whereClause.createdAt = {
            gte: new Date(startDate),
            lt: endOfDay, // Use 'less than' the start of the next day
        }
    }

    const leaveRequests = await db.leaveRequest.findMany({
      where: whereClause,
      include: {
        leaveType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(leaveRequests, { status: 200 });

  } catch (error) {
    console.error("[LEAVE_REQUESTS_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// This function creates a new leave request
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { leaveTypeId, startDate, endDate } = body;

    if (!leaveTypeId || !startDate || !endDate) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const employeeProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!employeeProfile) {
      return new NextResponse("Employee profile not found for this user", { status: 404 });
    }
    
    const leaveType = await db.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) {
        return new NextResponse("Invalid Leave Type", { status: 400 });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDifference = end.getTime() - start.getTime();
    const requestedDays = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;

    if (requestedDays <= 0) {
        return new NextResponse("End date must be on or after start date", { status: 400 });
    }
    
    const currentYear = start.getFullYear();
    const currentMonth = start.getMonth() + 1;
    const periodMonth = leaveType.cadence === 'MONTHLY' ? currentMonth : null;

    let balance = await db.leaveBalance.findFirst({
        where: {
            employeeId: employeeProfile.id,
            leaveTypeId: leaveTypeId,
            year: currentYear,
            month: periodMonth
        }
    });

    if (!balance) {
        balance = await db.leaveBalance.create({
            data: {
                employeeId: employeeProfile.id,
                leaveTypeId: leaveTypeId,
                year: currentYear,
                month: periodMonth,
                total: leaveType.defaultAllowance,
                remaining: leaveType.defaultAllowance,
                isManualOverride: false,
            }
        });
    }

    if (balance.remaining < requestedDays) {
        return new NextResponse(`Insufficient leave balance. Remaining: ${balance.remaining}, Requested: ${requestedDays}`, { status: 400 });
    }

    const leaveRequest = await db.leaveRequest.create({
      data: {
        employeeId: employeeProfile.id,
        leaveTypeId: leaveTypeId,
        startDate: start,
        endDate: end,
        status: 'PENDING',
      },
    });

    return NextResponse.json(leaveRequest, { status: 201 });

  } catch (error) {
    console.error("[LEAVE_REQUEST_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}