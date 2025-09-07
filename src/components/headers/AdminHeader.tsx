// File: src/components/headers/AdminHeader.tsx
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function AdminHeader() {
  const { data: session } = useSession();

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
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/employees">Employees</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/holidays">Holidays</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/work-schedules">Schedules</Link>
        </Button>
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