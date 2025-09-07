// src/app/api/employees/list/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db'; // ✅ Named import

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  try {
    const employees = await db.user.findMany({
      where: { isActive: true },
      select: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        email: true,
      },
    });

    const formattedEmployees = employees
      .map(emp => ({
        id: emp.profile!.id,
        firstName: emp.profile!.firstName,
        lastName: emp.profile!.lastName,
        user: {
          email: emp.email,
        },
      }))
      .filter(emp => emp.id); // Remove any without a profile

    return NextResponse.json(formattedEmployees);
  } catch (error) {
    console.error('[GET_EMPLOYEES_LIST]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}