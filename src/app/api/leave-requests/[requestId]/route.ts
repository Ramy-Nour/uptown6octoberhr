import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions);
  const sessionUserRole = session?.user?.role;

  if (!session || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { status, denialReason } = await req.json();
    const { requestId } = params;

    const userProfile = await db.employeeProfile.findUnique({
        where: { userId: session.user.id }
    });

    if (!userProfile) {
        return new NextResponse("User profile not found", { status: 404 });
    }

    const leaveRequestToUpdate = await db.leaveRequest.findUnique({
        where: { id: requestId },
        include: { employee: true, leaveType: true }
    });

    if (!leaveRequestToUpdate) {
        return new NextResponse("Leave request not found", { status: 404 });
    }

    // --- New, Smarter Security Check ---
    const isManagerOfEmployee = leaveRequestToUpdate.employee.managerId === userProfile.id;
    const isAdminOrSuperAdmin = sessionUserRole === 'ADMIN' || sessionUserRole === 'SUPER_ADMIN';

    // A manager can only approve to the 'APPROVED_BY_MANAGER' step or deny.
    if ((status === 'APPROVED_BY_MANAGER' || status === 'DENIED') && !isManagerOfEmployee && !isAdminOrSuperAdmin) {
         return new NextResponse("Forbidden: You are not the manager for this employee", { status: 403 });
    }

    // Only an Admin can give the final approval.
    if (status === 'APPROVED_BY_ADMIN' && !isAdminOrSuperAdmin) {
        return new NextResponse("Forbidden: Only Admins can give final approval", { status: 403 });
    }

    // --- Update Logic ---
    if (status === 'APPROVED_BY_MANAGER') {
        const start = new Date(leaveRequestToUpdate.startDate);
        const end = new Date(leaveRequestToUpdate.endDate);
        const requestedDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

        const currentYear = start.getFullYear();
        const currentMonth = start.getMonth() + 1;

        const balance = await db.leaveBalance.findFirst({
            where: {
                employeeId: leaveRequestToUpdate.employeeId,
                leaveTypeId: leaveRequestToUpdate.leaveTypeId,
                year: currentYear,
                month: leaveRequestToUpdate.leaveType.cadence === 'MONTHLY' ? currentMonth : null
            }
        });

        if (!balance || balance.remaining < requestedDays) {
            return new NextResponse("Employee has insufficient balance", { status: 400 });
        }

        await db.$transaction([
            db.leaveRequest.update({ where: { id: requestId }, data: { status: 'APPROVED_BY_MANAGER' } }),
            db.leaveBalance.update({ where: { id: balance.id }, data: { remaining: { decrement: requestedDays } } })
        ]);
    } else if (status === 'DENIED' || status === 'APPROVED_BY_ADMIN') {
        // For Final Approval or Denial, we just update the status and reason
        await db.leaveRequest.update({
            where: { id: requestId },
            data: { 
                status: status,
                denialReason: status === 'DENIED' ? denialReason : null // Add reason on denial, clear it on approval
            }
        });
    } else {
        return new NextResponse("Invalid status update", { status: 400 });
    }

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error("[LEAVE_REQUEST_PATCH_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}