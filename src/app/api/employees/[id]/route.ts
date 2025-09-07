import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

// This is the corrected GET function.
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    // THE FIX: We now correctly look for the employee by the profile's own ID,
    // not by the userId. This makes it consistent with the DELETE function.
    const employee = await db.employeeProfile.findUnique({
      where: { id: params.id }, 
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        manager: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!employee) {
      return new NextResponse("Employee not found", { status: 404 });
    }

    return NextResponse.json(employee, { status: 200 });
  } catch (error) {
    console.error("[GET_EMPLOYEE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Your original, working PATCH function
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, firstName, lastName, position, hireDate, managerId } = body;

    // First, find the employee profile using the ID from the URL.
    const profile = await db.employeeProfile.findUnique({
      where: { id: params.id },
    });

    if (!profile) {
      return new NextResponse("Employee profile not found", { status: 404 });
    }

    // --- Start of Transaction ---
    // We use a transaction to make sure both database updates succeed or fail together.
    await db.$transaction(async (tx) => {
      // Update 1: Update the EmployeeProfile table
      await tx.employeeProfile.update({
          where: { id: params.id },
          data: {
              firstName,
              lastName,
              position,
              hireDate: hireDate ? new Date(hireDate) : null,
              managerId,
          }
      });

      // Update 2: Update the email on the related User table
      await tx.user.update({
        where: { id: profile.userId }, // Use the stable userId
        data: { email },
      });
    });
    // --- End of Transaction ---

    return new NextResponse("Employee updated successfully", { status: 200 });
  } catch (error) {
    console.error("[EMPLOYEE_UPDATE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Your original, working DELETE function
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  try {
    const profile = await db.employeeProfile.findUnique({ where: { id: params.id }});
    if (!profile) {
        return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    await db.user.update({
      where: { id: profile.userId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "User deactivated successfully" }, { status: 200 });
  } catch (error) {
    console.error("[DEACTIVATE_USER_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}