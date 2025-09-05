// File: src/app/api/leave-requests/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";

// Fetches the leave request history for the logged-in user
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

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

    if (startDate && endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setDate(endOfDay.getDate() + 1);

        whereClause.createdAt = {
            gte: new Date(startDate),
            lt: endOfDay,
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

// Creates a new leave request
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

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      return new NextResponse("End date must be on or after start date", { status: 400 });
    }

    const employeeProfile = await db.employeeProfile.findUnique({
      where: { userId: session.user.id },
      include: { workSchedule: true },
    });

    if (!employeeProfile) {
      return new NextResponse("Employee profile not found", { status: 404 });
    }
    
    let workSchedule = employeeProfile.workSchedule;
    if (!workSchedule) {
      workSchedule = await db.workSchedule.findFirst({ where: { isDefault: true } });
    }
    if (!workSchedule) {
      return new NextResponse("No default work schedule found. Please configure one.", { status: 500 });
    }

    const holidays = await db.holiday.findMany({
      where: { date: { gte: start, lte: end } },
    });
    const holidayDates = new Set(holidays.map(h => h.date.toISOString().split('T')[0]));
    
    let workingDaysRequested = 0;
    let currentDate = new Date(start);

    const weekendMap = [
      !workSchedule.isSunday, !workSchedule.isMonday, !workSchedule.isTuesday,
      !workSchedule.isWednesday, !workSchedule.isThursday, !workSchedule.isFriday,
      !workSchedule.isSaturday
    ];

    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      const dateString = currentDate.toISOString().split('T')[0];

      if (!weekendMap[dayOfWeek] && !holidayDates.has(dateString)) {
        workingDaysRequested++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (workingDaysRequested <= 0) {
        return new NextResponse("Your request does not contain any working days.", { status: 400 });
    }

    const balance = await db.leaveBalance.findFirst({
      where: {
        employeeId: employeeProfile.id,
        leaveTypeId: leaveTypeId,
        year: start.getFullYear(),
      },
    });

    if (!balance || balance.remaining < workingDaysRequested) {
      return new NextResponse(`Insufficient leave balance. Remaining: ${balance?.remaining || 0}, Requested Working Days: ${workingDaysRequested}`, { status: 400 });
    }

    let status: 'PENDING_MANAGER' | 'PENDING_ADMIN' = 'PENDING_MANAGER';
    let skipReason: string | null = null;

    if (!employeeProfile.managerId) {
      status = 'PENDING_ADMIN';
      skipReason = 'No manager assigned.';
    } else {
      const managerOnLeave = await db.leaveRequest.findFirst({
        where: {
          employeeId: employeeProfile.managerId,
          status: { in: ['APPROVED_BY_MANAGER', 'APPROVED_BY_ADMIN'] },
          startDate: { lte: end },
          endDate: { gte: start },
        },
      });
      if (managerOnLeave) {
        status = 'PENDING_ADMIN';
        skipReason = 'Manager is on leave during the requested period.';
      }
    }

    const leaveRequest = await db.leaveRequest.create({
      data: {
        employeeId: employeeProfile.id,
        leaveTypeId: leaveTypeId,
        startDate: start,
        endDate: end,
        status: status,
        skipReason: skipReason,
      },
    });

    return NextResponse.json(leaveRequest, { status: 201 });

  } catch (error) {
    console.error("[LEAVE_REQUEST_POST_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}