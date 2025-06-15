
import type { ShiftReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ListChecks, Landmark, CalendarDays, User, Clock } from 'lucide-react';

interface ShiftReportCardProps {
  report: ShiftReport;
}

export function ShiftReportCard({ report }: ShiftReportCardProps) {
  // New ShiftReport schema:
  // - username (denormalized user name)
  // - status ('active', 'closed')
  // - finalRevenue (replaces totalRevenue)
  // - totalCashIn, totalCardIn, totalQrIn (payment breakdown)
  // - totalTransactions (replaces transactionsCount)
  // - paymentMethods object is removed from the new schema for ShiftReport

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Shift Report
        </CardTitle>
        <CardDescription className="flex flex-col">
          <span>
            Start: {report.startTime ? new Date(report.startTime).toLocaleString() : 'N/A'}
          </span>
          <span>
            End: {report.endTime ? new Date(report.endTime).toLocaleString() : 'N/A'}
          </span>
          <span className="capitalize">
            Status: <span className={report.status === 'active' ? 'text-green-600' : 'text-red-600'}>{report.status}</span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center p-3 bg-muted rounded-md">
            <User className="h-6 w-6 mr-3 text-gray-500" />
            <div>
                <p className="text-sm text-muted-foreground">Staff</p>
                <p className="text-lg font-semibold">{report.username || 'N/A'}</p>
            </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 mr-3 text-green-500" />
            <div>
                <p className="text-sm text-muted-foreground">Final Revenue</p>
                <p className="text-2xl font-bold">${(report.finalRevenue || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
           <div className="flex items-center">
            <ListChecks className="h-6 w-6 mr-3 text-blue-500" />
            <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-bold">{report.totalTransactions || 0}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2 flex items-center">
            <Landmark className="mr-2 h-5 w-5 text-purple-500" /> Payment Totals:
          </h4>
          <ul className="space-y-1 list-disc list-inside pl-2 text-sm">
            <li>Cash: ${(report.totalCashIn || 0).toFixed(2)}</li>
            <li>Card: ${(report.totalCardIn || 0).toFixed(2)}</li>
            <li>QR: ${(report.totalQrIn || 0).toFixed(2)}</li>
          </ul>
        </div>
         {report.notes && (
          <div>
            <h4 className="font-semibold mb-1">Notes:</h4>
            <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{report.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
