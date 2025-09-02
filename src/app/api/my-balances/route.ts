import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  // 1. Ensure user is logged in
  if (!session || !session.user || !session.user.id) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  // 2. Find the user's employee profile
  const employeeProfile = await db.employeeProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!employeeProfile) {
    // This is a valid case for a user who is not an employee yet
    return NextResponse.json([]); // Return an empty array
  }

  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12

    // 3. Get all available leave types
    const leaveTypes = await db.leaveType.findMany();

    // 4. For each leave type, check if a balance exists. If not, create it.
    for (const lt of leaveTypes) {
      const periodYear = lt.cadence === 'ANNUAL' ? currentYear : currentYear;
      const periodMonth = lt.cadence === 'MONTHLY' ? currentMonth : null;

      const existingBalance = await db.leaveBalance.findFirst({
        where: {
          employeeId: employeeProfile.id,
          leaveTypeId: lt.id,
          year: periodYear,
          month: periodMonth,
        },
      });

      // If no balance exists for this period, create it with the default allowance
      if (!existingBalance) {
        await db.leaveBalance.create({
          data: {
            employeeId: employeeProfile.id,
            leaveTypeId: lt.id,
            year: periodYear,
            month: periodMonth,
            total: lt.defaultAllowance,
            remaining: lt.defaultAllowance,
          },
        });
      }
    }

    // 5. Fetch and return all of the user's balances (now they are guaranteed to exist)
    const allBalances = await db.leaveBalance.findMany({
        where: { employeeId: employeeProfile.id },
        include: {
            leaveType: true,
        },
        orderBy: {
            leaveType: {
                name: 'asc'
            }
        }
    });

    return NextResponse.json(allBalances, { status: 200 });

  } catch (error) {
    console.error("[MY_BALANCES_GET_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}