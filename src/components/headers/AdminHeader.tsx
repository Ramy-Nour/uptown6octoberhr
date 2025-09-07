// File: src/components/headers/AdminHeader.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AdminHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const nav = [
    { href: '/admin/employees', label: 'Employees' },
    { href: '/admin/holidays', label: 'Holidays' },
    { href: '/admin/work-schedules', label: 'Schedules' },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border-b">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-xl font-bold text-gray-800">
          <Link href="/dashboard">Uptown October HR</Link>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome, {session?.user?.email} (Admin)
        </p>
      </div>
      <div className="flex items-center space-x-2 flex-wrap justify-end gap-2">
        {nav.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Button
              key={item.href}
              asChild
              size="sm"
              variant={active ? 'secondary' : 'ghost'}
              className={cn(active && 'ring-1 ring-ring')}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          );
        })}
        <Button
          onClick={() => signOut({ callbackUrl: '/login' })}
          variant="destructive"
          size="sm"
        >
          Log Out
        </Button>
      </div>
    </div>
  );
}