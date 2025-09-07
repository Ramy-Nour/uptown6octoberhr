// File: src/components/headers/EmployeeHeader.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function EmployeeHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const nav = [
    { href: '/dashboard', label: 'My Dashboard' },
    { href: '/dashboard/leave/request', label: 'Request Leave' },
    { href: '/dashboard/settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border-b">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-xl font-bold text-gray-800">
          <Link href="/dashboard">Dashboard</Link>
        </h1>
        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
          Welcome, {session?.user?.email}
        </p>
      </div>
      <div className="flex items-center space-x-2 flex-wrap justify-end gap-2">
        {nav.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href);
          return (
            <Button
              key={item.href}
              asChild
              size="sm"
              variant={active ? 'secondary' : 'ghost'}
              className={cn(active && 'ring-1 ring-yellow-500')}
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
  );
}