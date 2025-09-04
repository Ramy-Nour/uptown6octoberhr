import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

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
    const { role, managerId } = body;

    // Validate role if provided
    if (role && !['EMPLOYEE', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      return new NextResponse("Invalid role", { status: 400 });
    }

    // Update user role if provided
    if (role) {
      await db.user.update({
        where: { id: params.id },
        data: { role },
      });
    }

    // Update manager if provided
    if (managerId !== undefined) {
      await db.employeeProfile.update({
        where: { userId: params.id },
        data: {
          managerId: managerId || null,
        },
      });
    }

    return new NextResponse("Employee updated successfully", { status: 200 });
  } catch (error) {
    console.error("[EMPLOYEE_UPDATE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

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
      where: { userId: params.id },
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