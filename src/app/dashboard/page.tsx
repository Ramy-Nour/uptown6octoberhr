'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If the session is loading, we don't do anything yet.
    if (status === 'loading') return;

    // If there is no session (user is not logged in), redirect to the login page.
    if (!session) {
      router.push('/login');
    }
  }, [session, status, router]);

  // While the session is loading, show a loading message.
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // If the user is authenticated, show the dashboard content.
  if (session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to the Dashboard</h1>
          <p className="text-lg mb-2">You are logged in as:</p>
          <p className="text-xl font-semibold mb-8">{session.user?.email}</p>
          <Button onClick={() => signOut({ callbackUrl: '/login' })}>
            Log Out
          </Button>
        </div>
      </main>
    );
  }

  // If the user is not authenticated and the redirect hasn't happened yet,
  // you can show a brief message or nothing at all.
  return null;
}