import db from './prisma';

/**
 * Checks if the manager approval step should be bypassed for a given employee.
 * Bypass is recommended if the employee has no manager or if the manager is currently on an approved leave.
 * @param employeeId The ID of the employee to check.
 * @returns {Promise<boolean>} - True if the manager should be bypassed, false otherwise.
 */
export async function shouldBypassManager(employeeId: string): Promise<boolean> {
  try {
    const employee = await db.employeeProfile.findUnique({
      where: { id: employeeId },
      include: {
        manager: true,
      },
    });

    // If there's no employee profile or no manager assigned, bypass.
    if (!employee || !employee.manager) {
      return true;
    }

    const managerId = employee.manager.id;
    const today = new Date();
    // Set time to the beginning of the day for a consistent date comparison.
    today.setHours(0, 0, 0, 0);

    // Check if the manager has an approved leave request that covers today.
    const managerOnLeave = await db.leaveRequest.findFirst({
      where: {
        employeeId: managerId,
        status: 'APPROVED_BY_ADMIN',
        startDate: {
          lte: today,
        },
        endDate: {
          gte: today,
        },
      },
    });

    // If the manager is on leave, bypass.
    if (managerOnLeave) {
      return true;
    }

    // Otherwise, do not bypass.
    return false;
  } catch (error) {
    console.error("Error in shouldBypassManager:", error);
    // In case of an error, default to not bypassing to be safe.
    return false;
  }
}
