
'use client';

import React, { useState, useEffect } from 'react';
import { ShiftReportCard } from '@/components/reports/ShiftReportCard';
import type { ShiftReport as ShiftReportType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, where, Timestamp } from 'firebase/firestore';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ReportsPage() {
  const [reports, setReports] = useState<ShiftReportType[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  useEffect(() => {
    const storedBranchId = localStorage.getItem('selectedBranchId');
    if (storedBranchId) {
      setSelectedBranchId(storedBranchId);
    } else {
      setReportsError("Branch ID not found. Please select a branch first.");
      setIsLoadingReports(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedBranchId || !dateRange?.from || !dateRange?.to) return;

    setIsLoadingReports(true);
    setReportsError(null);

    const reportsCollectionRef = collection(db, "branches", selectedBranchId, "shiftReports");
    // Ensure dates are Firestore Timestamps for querying
    const startTimeStamp = Timestamp.fromDate(dateRange.from);
    const endTimeStamp = Timestamp.fromDate(new Date(dateRange.to.setHours(23, 59, 59, 999))); // End of selected day

    const reportsQuery = query(
      reportsCollectionRef,
      orderBy("startTime", "desc"), // Show newest reports first
      where("startTime", ">=", startTimeStamp),
      where("startTime", "<=", endTimeStamp)
    );

    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const fetchedReports: ShiftReportType[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: data.startTime?.toDate ? data.startTime.toDate() : new Date(),
          endTime: data.endTime?.toDate ? data.endTime.toDate() : undefined,
        } as ShiftReportType;
      });
      setReports(fetchedReports);
      setIsLoadingReports(false);
    }, (error) => {
      console.error("Error fetching shift reports:", error);
      setReportsError("Failed to load shift reports.");
      setIsLoadingReports(false);
    });

    return () => unsubscribe();
  }, [selectedBranchId, dateRange]);


  if (isLoadingReports) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading reports...</p>
      </div>
    );
  }

  if (reportsError) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error Loading Reports</AlertTitle>
          <AlertDescription>{reportsError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-card rounded-lg shadow">
        <h1 className="text-2xl font-bold text-primary">Shift Reports</h1>
        <div className="flex gap-2 items-center">
           <DatePickerWithRange 
            initialDateRange={dateRange}
            onUpdate={(range) => setDateRange(range)} // Assuming DatePickerWithRange has onUpdate prop
          />
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>
      
      {reports.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No reports available for the selected period.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map(report => (
            <ShiftReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}

// Ensure DatePickerWithRange component is updated to accept onUpdate or similar prop
// For now, I'll update the component signature in its file.
