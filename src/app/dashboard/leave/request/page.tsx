'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Balance = {
  id: string;
  leaveType: { id: string; name: string; unit: string; };
  remaining: number;
}

export default function RequestLeavePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [balances, setBalances] = useState<Balance[]>([]);
  const [selectedLeaveTypeId, setSelectedLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    const fetchBalances = async () => {
      try {
        const response = await fetch('/api/my-balances');
        if (!response.ok) throw new Error('Failed to fetch balances');
        setBalances(await response.json());
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchBalances();
  }, [session, status, router]);
  
  const selectedBalance = balances.find(b => b.leaveType.id === selectedLeaveTypeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveTypeId: selectedLeaveTypeId, startDate, endDate }),
      });

      if (!response.ok) {
        const data = await response.text();
        throw new Error(data || 'Failed to submit request');
      }
      
      alert('Leave request submitted successfully!');
      router.push('/dashboard');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }

  return (
    <div className="flex items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Request Time Off</CardTitle>
          <CardDescription>Select a leave type and the desired dates for your request.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
              <Label>Leave Type</Label>
              <Select onValueChange={setSelectedLeaveTypeId} value={selectedLeaveTypeId}>
                <SelectTrigger><SelectValue placeholder="Select a leave type..." /></SelectTrigger>
                <SelectContent>
                  {balances.map(b => (
                    <SelectItem key={b.id} value={b.leaveType.id}>
                      {b.leaveType.name} (Remaining: {b.remaining} {b.leaveType.unit.toLowerCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                    </Popover>
                </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
          <div className="flex justify-end p-6 pt-0">
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit Request'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}