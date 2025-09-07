// File: src/components/headers/SuperAdminHeader.tsx
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function SuperAdminHeader() {
  const {  session } = useSession();

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
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/employees">Employees</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/holidays">Holidays</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/work-schedules">Schedules</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="bg-white text-red-700 hover:bg-gray-100">
            <Link href="/admin/manage-admins">Manage Admins</Link>
          </Button>
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