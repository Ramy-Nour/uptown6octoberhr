// src/app/api/employees/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
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

// Fixed PATCH function - changed hireDate to startDate
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
    // Changed from hireDate to startDate
    const { email, firstName, lastName, position, startDate, managerId } = body;

    // First, find the employee profile using the ID from the URL.
    const profile = await db.employeeProfile.findUnique({
      where: { id: params.id },
    });

    if (!profile) {
      return new NextResponse("Employee profile not found", { status: 404 });
    }

    // --- Start of Transaction ---
    await db.$transaction(async (tx) => {
      // Update 1: Update the EmployeeProfile table
      await tx.employeeProfile.update({
          where: { id: params.id },
          data: {
              firstName,
              lastName,
              position,
              // Changed from hireDate to startDate
              startDate: startDate ? new Date(startDate) : null,
              managerId,
          }
      });

      // Update 2: Update the email on the related User table
      await tx.user.update({
        where: { id: profile.userId },
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