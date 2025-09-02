import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    const { leaveTypeId, year, newTotal, applyToAll } = body;

    if (!leaveTypeId || !year || newTotal === undefined) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const yearInt = parseInt(year, 10);
    const newTotalFloat = parseFloat(newTotal);

    // This is the base condition to find the right balances
    let whereClause: any = {
      leaveTypeId: leaveTypeId,
      year: yearInt,
    };

    // If 'applyToAll' is false, we ONLY update balances that are NOT manual overrides.
    if (applyToAll === false) {
      whereClause.isManualOverride = false;
    }
    // If 'applyToAll' is true, we don't add any more conditions, so it updates everyone.

    const result = await db.leaveBalance.updateMany({
      where: whereClause,
      data: {
        total: newTotalFloat,
        remaining: newTotalFloat, // Reset remaining to the new total
        isManualOverride: false, // A bulk update always resets balances to the default state
      },
    });

    return NextResponse.json({ message: `${result.count} employee balances were updated.` }, { status: 200 });

  } catch (error) {
    console.error("[BULK_UPDATE_BALANCES_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}