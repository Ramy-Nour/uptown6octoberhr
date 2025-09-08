'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

type Employee = { id: string; firstName: string; lastName: string; };
type ReportData = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  denialReason: string | null;
  employee: { firstName: string; lastName: string; };
  leaveType: { name: string; };
}

export default function ReportsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const fetchEmployees = async () => {
        setIsLoading(true);
        try {
          let res: Response;
          if (session?.user.role === 'ADMIN' || session?.user.role === 'SUPER_ADMIN') {
            res = await fetch('/api/employees');
          } else {
            // managers and employees: fetch only accessible employees
            res = await fetch('/api/manager/accessible-employees');
          }
          if (!res.ok) throw new Error('Failed to fetch employees');
          setEmployees(await res.json());
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchEmployees();
    } else if (sessionStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [sessionStatus, router, session]);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError('');
    setReportData([]); // Clear previous results
    try {
      if (!startDate || !endDate) {
        throw new Error('Please select both a start and end date.');
      }
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      
      const url = `/api/reports/leave?employeeId=${selectedEmployeeId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to generate report.');
      }
      const data = await response.json();
      setReportData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionStatus === 'loading') {
    return <div className="flex items-center justify-center min-h-screen"><p>Loading...</p></div>;
  }
  
  // --- FIX: Pre-build the table content to prevent hydration errors ---
  const reportTableContent = reportData.length > 0 ? (
    reportData.map(req => (
      <TableRow key={req.id}>
        <TableCell>{req.employee.firstName} {req.employee.lastName}</TableCell>
        <TableCell>{req.leaveType.name}</TableCell>
        <TableCell>{format(new Date(req.startDate), 'PPP')} - {format(new Date(req.endDate), 'PPP')}</TableCell>
        <TableCell><Badge variant={req.status === 'DENIED' ? 'destructive' : 'default'}>{req.status.replace(/_/g, ' ')}</Badge></TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow><TableCell colSpan={4} className="text-center">No data for the selected criteria. Please generate a report.</TableCell></TableRow>
  );

  return (
    <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
        <div className="mb-4">
            <Button asChild variant="outline">
                <Link href="/dashboard">← Back to Dashboard</Link>
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests Report</CardTitle>
          <CardDescription>Generate reports for leave requests by employee and date range.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="grid gap-2">
              <Label>Employee</Label>
              <Select onValueChange={setSelectedEmployeeId} defaultValue="all">
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <DatePicker value={endDate} onChange={setEndDate} />
            </div>
            <div>
              <Button onClick={handleGenerateReport} disabled={isLoading}>{isLoading ? 'Generating...' : 'Generate Report'}</Button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Report Results</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Dates</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {reportTableContent}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}