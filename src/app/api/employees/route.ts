import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  // Check if user is an ADMIN
  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const employees = await db.employeeProfile.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
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
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  // 1. Check if user is an ADMIN
  if (!session || session.user.role !== 'ADMIN') {
    return new NextResponse("Unauthorized", { status: 403 });
  }

  try {
    const body = await req.json();
    const { email, password, firstName, lastName, position, startDate } = body;

    // 2. Check if user with that email already exists
    const existingUser = await db.user.findUnique({
      where: { email: email },
    });

    if (existingUser) {
      return new NextResponse("User with this email already exists", { status: 409 });
    }

    // 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create the User and their EmployeeProfile in one transaction
    const newUser = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'EMPLOYEE', // All users created here are employees
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
        profile: true, // Include the new profile in the response
      },
    });
    
    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error("[EMPLOYEE_CREATION_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}