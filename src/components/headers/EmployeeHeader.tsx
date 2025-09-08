// File: src/components/headers/EmployeeHeader.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function EmployeeHeader() {
  const { data: session } = useSession();

  // Employee: only Logout (no navigation buttons)
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