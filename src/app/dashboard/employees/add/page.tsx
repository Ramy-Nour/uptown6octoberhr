'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddEmployeePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    position: '',
    startDate: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return; // Do nothing while loading
    if (status === 'unauthenticated' || session?.user.role !== 'ADMIN') {
      router.push('/dashboard'); // Redirect if not an admin
    }
  }, [session, status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.text();
        throw new Error(data || 'Failed to create employee');
      }

      setSuccess('Employee created successfully!');
      // Optionally, reset the form
      setFormData({ email: '', password: '', firstName: '', lastName: '', position: '', startDate: '' });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading' || !session || session.user.role !== 'ADMIN') {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading or redirecting...</p></div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Add New Employee</CardTitle>
          <CardDescription>Enter the details for the new employee.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
            <div className="grid gap-2 col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="grid gap-2 col-span-2">
              <Label htmlFor="password">Temporary Password</Label>
              <Input id="password" type="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" value={formData.position} onChange={handleChange} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
            </div>
            {error && <p className="text-sm text-destructive col-span-2">{error}</p>}
            {success && <p className="text-sm text-green-600 col-span-2">{success}</p>}
          </CardContent>
          <div className="flex justify-end p-6 pt-0">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Employee'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}