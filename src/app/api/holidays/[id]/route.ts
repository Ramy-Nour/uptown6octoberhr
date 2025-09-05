// File: src/app/api/holidays/[id]/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * @swagger
 * /api/holidays/{id}:
 * patch:
 * summary: Updates an existing holiday
 * description: Modifies the details of a specific holiday by its ID.
 * tags: [Holidays]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: The ID of the holiday to update.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * date:
 * type: string
 * format: date-time
 * type:
 * type: string
 * enum: [NATIONAL, COMPANY, TEAM, EMPLOYEE]
 * isLocked:
 * type: boolean
 * responses:
 * 200:
 * description: Holiday updated successfully.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Holiday'
 * 404:
 * description: Holiday not found.
 * 500:
 * description: Internal server error.
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const holidayId = params.id;
    const body = await request.json();

    const updatedHoliday = await prisma.holiday.update({
      where: { id: holidayId },
      data: {
        ...body,
        // If the date is being updated, ensure it's a Date object
        ...(body.date && { date: new Date(body.date) }),
      },
    });

    return NextResponse.json(updatedHoliday);
  } catch (error) {
    console.error(`Failed to update holiday ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to update holiday' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/holidays/{id}:
 * delete:
 * summary: Deletes a holiday
 * description: Removes a specific holiday from the database by its ID.
 * tags: [Holidays]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: The ID of the holiday to delete.
 * responses:
 * 200:
 * description: Holiday deleted successfully.
 * 404:
 * description: Holiday not found.
 * 500:
 * description: Internal server error.
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const holidayId = params.id;

    await prisma.holiday.delete({
      where: { id: holidayId },
    });

    return NextResponse.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error(`Failed to delete holiday ${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete holiday' },
      { status: 500 }
    );
  }
}