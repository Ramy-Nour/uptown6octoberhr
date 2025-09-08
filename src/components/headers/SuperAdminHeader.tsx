// File: src/components/headers/SuperAdminHeader.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function SuperAdminHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  // Super Admin: all admin buttons + Manage Admins
  const nav = [
    { href: '/admin/employees', label: 'Manage Employees' },
    { href: '/admin/employees/create', label: 'Add Employee' },
    { href: '/dashboard/reports', label: 'Reports' },
    { href: '/dashboard/settings/leave-types', label: 'Leave Types' },
    { href: '/dashboard/settings/leave-balances', label: 'Leave Balances' },
    { href: '/admin/holidays', label: 'Holidays' },
    { href: '/admin/work-schedules', label: 'Schedules' },
    { href: '/dashboard/settings/bulk-update', label: 'Bulk Update' },
    { href: '/admin/manage-admins', label: 'Manage Admins' },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border-b">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-xl font-bold text-gray-800">
          <Link href="/dashboard">Uptown October HR</Link>
        </h1>
        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
          Welcome, {session?.user?.email} (Super Admin)
        </p>
        <p className="text-sm text-muted-foreground mt-1 sm:hidden">
          Super Admin Mode
        </p>
      </div>
      <div className="w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-wrap justify-end gap-2">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href);
            return (
              <Button
                key={item.href}
                asChild
                size="sm"
                variant="outline"
                className={cn(
                  active
                    ? 'bg-yellow-500 text-black hover:bg-yellow-500/90 ring-1 ring-yellow-600'
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                )}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            );
          })}
          <Button
            onClick={() => signOut({ callbackUrl: '/login' })}
            variant="destructive"
            size="sm"
            className="w-full sm:w-auto"
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}