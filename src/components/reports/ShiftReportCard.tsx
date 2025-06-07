import type { ShiftReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ListChecks, Landmark, CalendarDays } from 'lucide-react';

interface ShiftReportCardProps {
  report: ShiftReport;
}

export function ShiftReportCard({ report }: ShiftReportCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
            <CalendarDays className="mr-2 h-5 w-5 text-primary" /> Shift Report
        </CardTitle>
        <CardDescription>
          {report.shiftStart.toLocaleDateString()} {report.shiftStart.toLocaleTimeString()} - {report.shiftEnd.toLocaleDateString()} {report.shiftEnd.toLocaleTimeString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 mr-3 text-green-500" />
            <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${report.totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-muted rounded-md">
           <div className="flex items-center">
            <ListChecks className="h-6 w-6 mr-3 text-blue-500" />
            <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{report.transactionsCount}</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2 flex items-center">
            <Landmark className="mr-2 h-5 w-5 text-purple-500" /> Payment Methods:
          </h4>
          <ul className="space-y-1 list-disc list-inside pl-2 text-sm">
            {Object.entries(report.paymentMethods).map(([method, amount]) => (
              <li key={method}>
                <span className="font-medium">{method.charAt(0).toUpperCase() + method.slice(1)}:</span> ${amount.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
