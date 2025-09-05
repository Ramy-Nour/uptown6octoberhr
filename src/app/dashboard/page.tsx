// File: src/app/dashboard/page.tsx

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
};

const denialReasons = ["High Work Capacity", "Request Overlaps", "Insufficient Notice", "Other"];

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [isManager, setIsManager] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [pendingManagerRequests, setPendingManagerRequests] = useState<Request[]>([]);
  const [pendingCancellations, setPendingCancellations] = useState<Request[]>([]);
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
  const [isCancellationRejection, setIsCancellationRejection] = useState(false);

  const isHr = session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN';

  const fetchData = async () => {
    if (!session) return;
    try {
      setError('');
      setIsLoading(true);
      const isManagerCheck = await fetch('/api/me/is-manager');
      if (!isManagerCheck.ok) throw new Error('Failed to check manager status');
      const { isManager: userIsManager } = await isManagerCheck.json();
      setIsManager(userIsManager);

      // FIXED: Correctly build the URL only when dates are selected
      let historyUrl = '/api/leave-requests';
      if (startDate && endDate) {
        historyUrl += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
      }

      const promises: Promise<Response>[] = [
        fetch('/api/my-balances'),
        fetch(historyUrl)
      ];

      if (userIsManager) {
        promises.push(fetch('/api/manager/pending-approvals'));
        promises.push(fetch('/api/manager/pending-cancellations'));
      }
      if (isHr) {
        promises.push(fetch('/api/admin/requests'));
      }

      const responses = await Promise.all(promises);
      for (const res of responses) {
        if (!res.ok) {
           const errBody = await res.json().catch(() => ({ message: `An API error occurred (${res.status})` }));
           throw new Error(errBody.message || `Failed to fetch data: ${res.status}`);
        }
      }

      const allData = await Promise.all(responses.map(res => res.json()));
      
      let currentIndex = 0;
      setBalances(allData[currentIndex++]);
      setRequestHistory(allData[currentIndex++]);
      
      if (userIsManager) {
        setPendingManagerRequests(allData[currentIndex++]);
        setPendingCancellations(allData[currentIndex++]);
      }
      if (isHr) {
        setPendingHrRequests(allData[currentIndex]);
      }
    } catch (err: any) {
      setError(err.message || "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated') fetchData();
    else if (sessionStatus === 'unauthenticated') router.push('/login');
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
        const data = await response.json();
        throw new Error(data.message || 'Action failed');
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
      setError("A reason is required.");
      return;
    }

    // UPDATED: This function is now smarter
    if (isCancellationRejection) {
      // This is a cancellation rejection
      await handleCancellationApproval(currentRequestToAction.id, 'REJECT', finalReason);
    } else {
      // This is a normal leave denial
      await handleRequestAction(currentRequestToAction.id, 'DENIED', finalReason);
    }
    
    setIsDenyDialogOpen(false);
    setDenialReason('');
    setOtherReason('');
    setIsCancellationRejection(false);
  };
  
  const handleCancelRequest = async (requestId: string, status: string) => {
    let endpoint = '';
    let confirmMessage = '';
    if (status === 'PENDING_MANAGER' || status === 'APPROVED_BY_MANAGER') {
      endpoint = `/api/leave-requests/${requestId}/cancel`;
      confirmMessage = 'Are you sure you want to cancel this pending request?';
    } else if (status === 'APPROVED_BY_ADMIN') {
      endpoint = `/api/leave-requests/${requestId}/request-cancellation`;
      confirmMessage = 'This will send a cancellation request to your manager. Are you sure?';
    } else return;
    if (!window.confirm(confirmMessage)) return;
    try {
      setError('');
      const response = await fetch(endpoint, { method: 'PATCH' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Action failed');
      }
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancellationApproval = async (requestId: string, action: 'APPROVE' | 'REJECT', reason?: string) => {
    const confirmMessage = action === 'APPROVE' 
      ? "Are you sure you want to approve this cancellation? The employee's leave balance will be restored."
      : "Are you sure you want to reject this cancellation request?";
    
    if (action === 'APPROVE' && !window.confirm(confirmMessage)) return;

    setError('');
    try {
      const response = await fetch(`/api/leave-requests/${requestId}/cancellation-approval`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }), // Send reason for rejections
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Action failed');
      }
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (sessionStatus === 'loading' || isLoading) {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }
  
  const balancesTableContent = balances.length > 0 ? (
    balances.map(b => (<TableRow key={b.id}><TableCell>{b.leaveType.name}</TableCell><TableCell>{b.leaveType.cadence === 'ANNUAL' ? b.year : `${getMonthName(b.month)} ${b.year}`}</TableCell><TableCell className="text-right font-medium">{b.remaining} {b.leaveType.unit.toLowerCase()}</TableCell><TableCell className="text-right">{b.total} {b.leaveType.unit.toLowerCase()}</TableCell></TableRow>))
  ) : ( <TableRow><TableCell colSpan={4} className="text-center">No balances to display.</TableCell></TableRow> );

  const historyTableContent = requestHistory.length > 0 ? (
    requestHistory.map(req => {
      const isCancellable = req.status === 'PENDING_MANAGER' || req.status === 'APPROVED_BY_MANAGER';
      const isCancellationRequestable = req.status === 'APPROVED_BY_ADMIN';
      return (
        <TableRow key={req.id}><TableCell>{req.leaveType.name}</TableCell><TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell><TableCell><Badge variant={req.status === 'DENIED' ? 'destructive' : 'default'}>{req.status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</Badge></TableCell><TableCell>{req.denialReason}</TableCell><TableCell className="text-right">{isCancellable && (<Button variant="link" size="sm" onClick={() => handleCancelRequest(req.id, req.status)}>Cancel</Button>)}{isCancellationRequestable && (<Button variant="link" size="sm" onClick={() => handleCancelRequest(req.id, req.status)}>Request Cancellation</Button>)}</TableCell></TableRow>
      );
    })
  ) : ( <TableRow><TableCell colSpan={5} className="text-center">No requests found in this period.</TableCell></TableRow> );

  const managerPendingContent = pendingManagerRequests.length > 0 ? (
    pendingManagerRequests.map(req => (<TableRow key={req.id}><TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell><TableCell>{req.leaveType.name}</TableCell><TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell><TableCell className="text-right space-x-2"><Button size="sm" variant="outline" onClick={() => { setCurrentRequestToAction(req); setIsDenyDialogOpen(true); setIsCancellationRejection(false); }}>Deny</Button><Button size="sm" onClick={() => handleRequestAction(req.id, 'APPROVED_BY_MANAGER')}>Approve</Button></TableCell></TableRow>))
  ) : ( <TableRow><TableCell colSpan={4} className="text-center">No requests waiting for your approval.</TableCell></TableRow> );

  // UPDATED: The "Reject Cancellation" button now opens the dialog
  const managerCancellationContent = pendingCancellations.length > 0 ? (
    pendingCancellations.map(req => (<TableRow key={req.id}><TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell><TableCell>{req.leaveType.name}</TableCell><TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell><TableCell className="text-right space-x-2"><Button size="sm" variant="outline" onClick={() => { setCurrentRequestToAction(req); setIsDenyDialogOpen(true); setIsCancellationRejection(true); }}>Reject Cancellation</Button><Button size="sm" onClick={() => handleCancellationApproval(req.id, 'APPROVE')}>Approve Cancellation</Button></TableCell></TableRow>))
  ) : ( <TableRow><TableCell colSpan={4} className="text-center">No pending cancellation requests.</TableCell></TableRow> );

  const hrPendingContent = pendingHrRequests.length > 0 ? (
    pendingHrRequests.map(req => (<TableRow key={req.id}><TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell><TableCell>{req.leaveType.name}</TableCell><TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell><TableCell className="text-right space-x-2"><Button size="sm" variant="outline" onClick={() => { setCurrentRequestToAction(req); setIsDenyDialogOpen(true); setIsCancellationRejection(false); }}>Deny</Button><Button size="sm" onClick={() => handleRequestAction(req.id, 'APPROVED_BY_ADMIN')}>Final Approve</Button></TableCell></TableRow>))
  ) : ( <TableRow><TableCell colSpan={4} className="text-center">No requests waiting for final HR approval.</TableCell></TableRow> );

  return (
    <>
      <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="text-muted-foreground">Welcome back, {session?.user?.email}</p></div>
          <div className="flex items-center space-x-2 flex-wrap justify-end">{isHr && ( <> <Button asChild><Link href="/admin/employees/create">Add Employee</Link></Button> <Button asChild variant="outline"><Link href="/admin/holidays">Holidays</Link></Button> <Button asChild variant="outline"><Link href="/admin/work-schedules">Schedules</Link></Button> <Button asChild variant="outline"><Link href="/dashboard/settings/bulk-update">Bulk Update</Link></Button> <Button asChild variant="outline"><Link href="/dashboard/reports">Reports</Link></Button> </> )}{session?.user.role === 'SUPER_ADMIN' && ( <Button asChild variant="outline"><Link href="/admin/manage-admins">Manage Admins</Link></Button> )}<Button onClick={() => signOut({ callbackUrl: '/login' })}>Log Out</Button></div>
        </div>
        
        {error && <Card className="bg-destructive/10 border-destructive"><CardHeader><CardTitle className="text-destructive">An Error Occurred</CardTitle><CardDescription className="text-destructive">{error}</CardDescription></CardHeader></Card>}

        {isHr && pendingHrRequests.length > 0 && (<Card className="border-red-500 bg-red-500/5"><CardHeader><CardTitle>Final HR Approvals</CardTitle><CardDescription>Manager-approved requests waiting for final sign-off.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{hrPendingContent}</TableBody></Table></CardContent></Card>)}

        {isManager && (
          <>
            <Card className="border-primary bg-primary/5"><CardHeader><CardTitle>Pending Leave Approvals</CardTitle><CardDescription>Requests waiting for your approval.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{managerPendingContent}</TableBody></Table></CardContent></Card>
            <Card className="border-yellow-500 bg-yellow-500/5"><CardHeader><CardTitle>Pending Cancellation Approvals</CardTitle><CardDescription>Employees requesting to cancel approved leave.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates to Cancel</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{managerCancellationContent}</TableBody></Table></CardContent></Card>
          </>
        )}

        <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>My Leave Balances</CardTitle><CardDescription>Your available leave for the current period.</CardDescription></div><Link href="/dashboard/leave/request"><Button>Request Time Off</Button></Link></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Leave Type</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Remaining</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{balancesTableContent}</TableBody></Table></CardContent></Card>

        <Card><CardHeader><CardTitle>My Request History</CardTitle><CardDescription>A history of all your submitted leave requests.</CardDescription></CardHeader><CardContent>
            <div className="flex items-center space-x-4 mb-4"><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal",!startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP") : <span>Pick start date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent></Popover><Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-[240px] justify-start text-left font-normal",!endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP") : <span>Pick end date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent></Popover><Button onClick={handleFilter}>Filter</Button></div>
            <Table><TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Status</TableHead><TableHead>Denial Reason</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{historyTableContent}</TableBody></Table>
        </CardContent></Card>
      </main>

      <Dialog open={isDenyDialogOpen} onOpenChange={(open) => {
        setIsDenyDialogOpen(open);
        if (!open) {
          setDenialReason('');
          setOtherReason('');
          setIsCancellationRejection(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCancellationRejection ? 'Reason for Rejecting Cancellation' : 'Reason for Denial'}</DialogTitle>
            <DialogDescription>
              {isCancellationRejection 
                ? 'Please provide a reason for rejecting this cancellation request.' 
                : 'Please provide a reason for denying this request.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4"><div className="grid gap-2"><Label htmlFor="denialReason">Reason</Label><Select onValueChange={setDenialReason} value={denialReason}><SelectTrigger><SelectValue placeholder="Select a reason..." /></SelectTrigger><SelectContent>{denialReasons.map((reason) => (<SelectItem key={reason} value={reason}>{reason}</SelectItem>))}</SelectContent></Select></div>{denialReason === 'Other' && (<div className="grid gap-2"><Label htmlFor="otherReason">Please specify</Label><Textarea id="otherReason" value={otherReason} onChange={(e) => setOtherReason(e.target.value)} /></div>)}</div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDenyDialogOpen(false)}>Cancel</Button><Button onClick={handleDenialSubmit}>{isCancellationRejection ? 'Confirm Rejection' : 'Confirm Denial'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}