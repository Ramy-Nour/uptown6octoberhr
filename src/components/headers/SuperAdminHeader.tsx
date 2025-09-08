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
    { href: '/admin/employees/new', label: 'Add Employee' },
    { href: '/admin/reports', label: 'Reports' },
    { href: '/admin/leave-types', label: 'Leave Types' },
    { href: '/admin/leave-balances', label: 'Leave Balances' },
    { href: '/admin/holidays', label: 'Holidays' },
    { href: '/admin/work-schedules', label: 'Schedules' },
    { href: '/admin/bulk-update', label: 'Bulk Update' },
    { href: '/admin/manage-admins', label: 'Manage Admins', highlight: true },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gradient-to-r from-red-600 to-pink-700 text-white shadow-lg rounded-b-lg">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-xl font-bold">
          <Link href="/dashboard">Uptown October HR</Link>
        </h1>
        <p className="text-sm opacity-90 mt-1 hidden sm:block">
          Welcome, {session?.user?.email} (Super Admin)
        </p>
        <p className="text-sm opacity-90 mt-1 sm:hidden">
          Super Admin Mode
        </p>
      </div>
      <div className="w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 flex-wrap justify-end gap-2">
          {nav.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href);
            // Unify to golden scheme. On dark gradient, use stronger contrast.
            const activeClasses = 'bg-yellow-300 text-red-900 ring-1 ring-yellow-100';
            const normalClasses = item.highlight ? 'bg-white text-red-700 hover:bg-gray-100' : 'bg-white/10 hover:bg-white/20';
            return (
              <Button
                key={item.href}
                asChild
                size="sm"
                variant="outline"
                className={cn(active ? activeClasses : normalClasses)}
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            );
          })}
          <Button
            onClick={() => signOut({ callbackUrl: '/login' })}
            variant="ghost"
            size="sm"
            className="bg-white text-red-700 hover:bg-gray-100 font-medium w-full sm:w-auto"
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  );
}