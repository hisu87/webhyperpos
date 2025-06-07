'use client';

import { ShiftReportCard } from '@/components/reports/ShiftReportCard';
import { MOCK_SHIFT_REPORT } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Assuming this component exists or will be created
import { Download } from 'lucide-react';

// Placeholder for DatePickerWithRange - replace with actual implementation or remove if not used
const DatePickerWithRangePlaceholder = () => (
  <Button variant="outline" className="w-[300px] justify-start text-left font-normal">
    Pick a date range
  </Button>
);


export default function ReportsPage() {
  // In a real app, you'd fetch reports based on selected date range
  const currentReport = MOCK_SHIFT_REPORT;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-card rounded-lg shadow">
        <h1 className="text-2xl font-bold text-primary">Shift Reports</h1>
        <div className="flex gap-2 items-center">
          {/* <DatePickerWithRange /> */}
          <DatePickerWithRangePlaceholder/>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>
      
      {currentReport ? (
        <ShiftReportCard report={currentReport} />
      ) : (
        <p className="text-muted-foreground text-center py-8">No reports available for the selected period.</p>
      )}

      {/* Placeholder for more reports or a list */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Past Reports</h2>
        <p className="text-muted-foreground">List of past reports would appear here...</p>
        {/* Example of how multiple reports might look */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ShiftReportCard report={MOCK_SHIFT_REPORT} />
          <ShiftReportCard report={{...MOCK_SHIFT_REPORT, id: 'SR2', totalRevenue: 950.20}} />
        </div> */}
      </div>
    </div>
  );
}
