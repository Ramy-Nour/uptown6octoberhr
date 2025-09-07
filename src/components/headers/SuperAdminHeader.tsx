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

  const nav = [
    { href: '/admin/employees', label: 'Employees' },
    { href: '/admin/holidays', label: 'Holidays' },
    { href: '/admin/work-schedules', label: 'Schedules' },
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
            const active = pathname?.startsWith(item.href);
            const variant = active ? 'outline' : item.highlight ? 'outline' : 'secondary';
            const baseClasses = item.highlight
              ? 'bg-white text-red-700 hover:bg-gray-100'
              : '';
            return (
              <Button
                key={item.href}
                asChild
                size="sm"
                variant={variant as any}
                className={cn(baseClasses, active && 'ring-1 ring-white/70')}
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