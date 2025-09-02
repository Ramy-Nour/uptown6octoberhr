'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Define types for our data
type Balance = {
  id: string;
  leaveType: { name: string; unit: string; cadence: string; };
  year: number; month: number | null; total: number; remaining: number;
}
type Request = {
  id: string;
  startDate: string; endDate: string;
  status: string;
  denialReason: string | null;
  employee: { firstName: string; lastName: string; };
  leaveType: { name: string; };
}

const getMonthName = (monthNumber: number | null) => {
    if (!monthNumber) return '';
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('en-US', { month: 'long' });
}

const denialReasons = ["High Work Capacity", "Request Overlaps", "Insufficient Notice", "Other"];

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [balances, setBalances] = useState<Balance[]>([]);
  const [pendingManagerRequests, setPendingManagerRequests] = useState<Request[]>([]);
  const [pendingHrRequests, setPendingHrRequests] = useState<Request[]>([]);
  const [requestHistory, setRequestHistory] = useState<Request[]>([]);
  
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false);
  const [currentRequestToAction, setCurrentRequestToAction] = useState<Request | null>(null);
  const [denialReason, setDenialReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const fetchData = async () => {
    if (!session) return;
    try {
      let historyUrl = '/api/leave-requests';
      if (startDate && endDate) {
          const formattedStartDate = startDate.toISOString().split('T')[0];
          const formattedEndDate = endDate.toISOString().split('T')[0];
          historyUrl += `?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      }

      const promisesToFetch = [ fetch('/api/my-balances'), fetch(historyUrl) ];
      
      const isManagerOrAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
      if (isManagerOrAdmin) {
        promisesToFetch.push(fetch('/api/manager/requests'));
        promisesToFetch.push(fetch('/api/admin/requests'));
      }

      const responses = await Promise.all(promisesToFetch);

      for (const res of responses) {
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Failed to fetch from ${res.url}: ${res.status} ${errorText}`);
        }
      }
      
      const [balancesData, historyData] = await Promise.all([responses[0].json(), responses[1].json()]);
      setBalances(balancesData);
      setRequestHistory(historyData);

      if (isManagerOrAdmin) {
        const [managerData, adminData] = await Promise.all([responses[2].json(), responses[3].json()]);
        setPendingManagerRequests(managerData);
        setPendingHrRequests(adminData);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      setIsLoading(true);
      fetchData();
    } else if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router]);

  const handleFilter = () => { fetchData(); };

  const handleRequestAction = async (requestId: string, newStatus: string, reason?: string) => {
    try {
        setError('');
        const response = await fetch(`/api/leave-requests/${requestId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, denialReason: reason }),
        });
        if (!response.ok) {
            const data = await response.text();
            throw new Error(data || 'Action failed');
        }
        fetchData();
    } catch (err: any) {
        setError(err.message);
    }
  };

  const handleDenialSubmit = async () => {
    if (!currentRequestToAction) return;
    const finalReason = denialReason === 'Other' ? otherReason : denialReason;
    if (!finalReason) {
        setError("A reason for denial is required.");
        return;
    }
    await handleRequestAction(currentRequestToAction.id, 'DENIED', finalReason);
    setIsDenyDialogOpen(false);
    setDenialReason('');
    setOtherReason('');
  };

  if (sessionStatus === 'loading' || isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }
  
  const isHr = session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN';

  // --- FINAL FIX: PRE-BUILD ALL TABLE CONTENT ---

  const balancesTableContent = balances.length > 0 ? (
    balances.map(b => (
      <TableRow key={b.id}>
        <TableCell>{b.leaveType.name}</TableCell>
        <TableCell>{b.leaveType.cadence === 'ANNUAL' ? b.year : `${getMonthName(b.month)} ${b.year}`}</TableCell>
        <TableCell className="text-right font-medium">{b.remaining} {b.leaveType.unit.toLowerCase()}</TableCell>
        <TableCell className="text-right">{b.total} {b.leaveType.unit.toLowerCase()}</TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow><TableCell colSpan={4} className="text-center">No balances to display.</TableCell></TableRow>
  );
  
  const historyTableContent = requestHistory.length > 0 ? (
    requestHistory.map(req => (
      <TableRow key={req.id}>
        <TableCell>{req.leaveType.name}</TableCell>
        <TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell>
        <TableCell><Badge variant={req.status === 'DENIED' ? 'destructive' : 'default'}>{req.status.replace(/_/g, ' ')}</Badge></TableCell>
        <TableCell>{req.denialReason}</TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow><TableCell colSpan={4} className="text-center">No requests found in this period.</TableCell></TableRow>
  );
  
  const managerPendingContent = pendingManagerRequests.map(req => (
      <TableRow key={req.id}>
          <TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell>
          <TableCell>{req.leaveType.name}</TableCell>
          <TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell>
          <TableCell className="text-right space-x-2">
              <Button size="sm" variant="outline" onClick={() => { setCurrentRequestToAction(req); setIsDenyDialogOpen(true); }}>Deny</Button>
              <Button size="sm" onClick={() => handleRequestAction(req.id, 'APPROVED_BY_MANAGER')}>Approve</Button>
          </TableCell>
      </TableRow>
  ));

  const hrPendingContent = pendingHrRequests.map(req => (
      <TableRow key={req.id}>
          <TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell>
          <TableCell>{req.leaveType.name}</TableCell>
          <TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell>
          <TableCell className="text-right space-x-2">
              <Button size="sm" variant="outline" onClick={() => { setCurrentRequestToAction(req); setIsDenyDialogOpen(true); }}>Deny</Button>
              <Button size="sm" onClick={() => handleRequestAction(req.id, 'APPROVED_BY_ADMIN')}>Final Approve</Button>
          </TableCell>
      </TableRow>
  ));

  return (
    <>
      <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="text-muted-foreground">Welcome back, {session?.user?.email}</p></div>
          <Button onClick={() => signOut({ callbackUrl: '/login' })}>Log Out</Button>
        </div>

        {isHr && pendingHrRequests.length > 0 && (
          <Card className="border-red-500 bg-red-500/5">
            <CardHeader><CardTitle>Final HR Approvals</CardTitle><CardDescription>Manager-approved requests waiting for final sign-off.</CardDescription></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{hrPendingContent}</TableBody></Table></CardContent>
          </Card>
        )}

        {isHr && pendingManagerRequests.length > 0 && (
          <Card className="border-primary bg-primary/5">
            <CardHeader><CardTitle>Manager Approvals</CardTitle><CardDescription>Requests waiting for your approval.</CardDescription></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{managerPendingContent}</TableBody></Table></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>My Leave Balances</CardTitle><CardDescription>Your available leave for the current period.</CardDescription></div>
            <Link href="/dashboard/leave/request"><Button>Request Time Off</Button></Link>
          </CardHeader>
          <CardContent><Table><TableHeader><TableRow><TableHead>Leave Type</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{balancesTableContent}</TableBody></Table></CardContent>
        </Card>
        
        <Card>
          <CardHeader><CardTitle>My Request History</CardTitle><CardDescription>A history of all your submitted leave requests.</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 mb-4">
              <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP") : <span>Pick a start date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent></Popover>
              <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP") : <span>Pick an end date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent></Popover>
              <Button onClick={handleFilter}>Filter</Button>
            </div>
            <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Status</TableHead><TableHead>Denial Reason</TableHead></TableRow></TableHeader><TableBody>{historyTableContent}</TableBody></Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reason for Denial</DialogTitle><DialogDescription>Please provide a reason for denying this request.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label htmlFor="denialReason">Reason</Label><Select onValueChange={setDenialReason} value={denialReason}><SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger><SelectContent>{denialReasons.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}</SelectContent></Select></div>
            {denialReason === 'Other' && ( <div className="grid gap-2"><Label htmlFor="otherReason">Please specify</Label><Textarea id="otherReason" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} /></div> )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDenyDialogOpen(false)}>Cancel</Button><Button onClick={handleDenialSubmit}>Confirm Denial</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}