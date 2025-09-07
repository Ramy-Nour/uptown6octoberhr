// File: src/components/headers/ManagerHeader.tsx
'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ManagerHeader() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white border-b shadow-sm">
      <div className="mb-4 sm:mb-0">
        <h1 className="text-xl font-bold text-gray-800">
          <Link href="/dashboard">Dashboard</Link>
        </h1>
        <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
          Welcome, {session?.user?.email} (Manager)
        </p>
        <p className="text-sm text-muted-foreground mt-1 sm:hidden">
          Manager Mode
        </p>
      </div>
      <div className="w-full sm:w-auto">
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