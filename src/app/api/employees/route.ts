import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";

// This function gets a list of all employees for the dropdown menu
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const employees = await db.employeeProfile.findMany({
      orderBy: {
        firstName: 'asc'
      },
      include: {
        user: {
          select: {
            email: true,
          }
        }
      }
    });
    return NextResponse.json(employees, { status: 200 });
  } catch (error) {
    console.error("[GET_EMPLOYEES_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// This is your existing function to create a new employee
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN')) {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, firstName, lastName, position, startDate } = body;

    const existingUser = await db.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return new NextResponse("User with this email already exists", { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'EMPLOYEE',
        profile: {
          create: {
            firstName,
            lastName,
            position,
            startDate: new Date(startDate),
          },
        },
      },
      include: {
        profile: true,
      },
    });
    
    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error("[EMPLOYEE_CREATION_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}