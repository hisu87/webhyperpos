
'use client';

import React, { useState, useEffect } from 'react';
import { TableCard } from '@/components/tables/TableCard';
import type { CafeTable as TableType } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, PlusCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { initializeFirebaseClient, db as getDbInstance } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function TablesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tables, setTables] = useState<TableType[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(true);
  const [tablesError, setTablesError] = useState<string | null>(null);
  const { toast } = useToast();

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);

  useEffect(() => {
    try {
      initializeFirebaseClient();
      setFirebaseInitialized(true);
    } catch (e) {
      console.error("Error initializing Firebase in TablesPage:", e);
      setTablesError("Failed to initialize core services. Please refresh.");
      setIsLoadingTables(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseInitialized) return;

    const storedBranchId = localStorage.getItem('selectedBranchId');
    if (storedBranchId) {
      setSelectedBranchId(storedBranchId);
    } else {
      setTablesError("Branch ID not found. Please select a branch first from the main page.");
      setIsLoadingTables(false);
    }
  }, [firebaseInitialized]);

  useEffect(() => {
    if (!selectedBranchId || !firebaseInitialized) {
      if(firebaseInitialized && !selectedBranchId && !localStorage.getItem('selectedBranchId')) {
        setTablesError("Branch ID not available for table loading.");
      }
      setIsLoadingTables(false);
      return;
    }

    const db = getDbInstance();
    if (!db) {
      setTablesError("Database service not available.");
      setIsLoadingTables(false);
      return;
    }

    setIsLoadingTables(true);
    setTablesError(null);

    const tablesCollectionRef = collection(db, "branches", selectedBranchId, "tables");
    const tablesQuery = query(tablesCollectionRef, orderBy("tableNumber"));

    const unsubscribe = onSnapshot(tablesQuery, (snapshot) => {
      const fetchedTables: TableType[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          branch: data.branch || { id: selectedBranchId, name: 'Unknown Branch'},
        } as TableType;
      });
      setTables(fetchedTables);
      setIsLoadingTables(false);
    }, (error) => {
      console.error("Error fetching tables:", error);
      setTablesError("Failed to load tables for this branch.");
      setIsLoadingTables(false);
    });

    return () => unsubscribe();
  }, [selectedBranchId, firebaseInitialized]);

  const handleUpdateTableStatus = async (tableId: string, newStatus: 'available' | 'cleaning') => {
    if (!selectedBranchId) {
        toast({ title: "Error", description: "No branch selected.", variant: "destructive"});
        return;
    }
    const db = getDbInstance();
    if (!db) {
        toast({ title: "Error", description: "Database service not available.", variant: "destructive"});
        return;
    }

    const tableRef = doc(db, "branches", selectedBranchId, "tables", tableId);
    
    try {
        const updatePayload: any = {
            status: newStatus,
            updatedAt: Timestamp.now()
        };
        
        const currentTable = tables.find(t => t.id === tableId);
        if(currentTable?.status === 'occupied' && newStatus !== 'occupied') {
             updatePayload.currentOrder = null;
        }
        if(currentTable?.status === 'reserved' && newStatus !== 'reserved') {
             updatePayload.reservationDetails = null;
        }
        
        await updateDoc(tableRef, updatePayload);
        toast({ title: "Status Updated", description: `Table status changed to ${newStatus}.` });
    } catch (error) {
        console.error("Error updating table status:", error);
        toast({ title: "Update Failed", description: "Could not update table status.", variant: "destructive"});
    }
  };

  const areas = Array.from(new Set(tables.map(table => table.zone || 'Default Area'))).sort();
  
  const filteredTables = tables.filter(table => 
    table.tableNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (table.zone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.status.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (!firebaseInitialized || (isLoadingTables && !tablesError && selectedBranchId)) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading tables...</p>
      </div>
    );
  }

  if (tablesError) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
         <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Error Loading Tables</AlertTitle>
          <AlertDescription>{tablesError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 bg-card rounded-lg shadow mb-4 sticky top-0 z-10">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Search tables (number, zone, status)..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => alert("Add new table functionality")}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Table
        </Button>
      </div>
      
      {tables.length === 0 && !isLoadingTables && firebaseInitialized ? (
         <div className="text-center py-10">
            <p className="text-xl text-muted-foreground">No tables found for this branch.</p>
            {!selectedBranchId && <p className="text-sm text-muted-foreground mt-2">Please ensure a branch is selected.</p>}
          </div>
      ) : (
        <Tabs defaultValue={areas[0] || 'all'} className="flex-grow flex flex-col">
          <TabsList className="mb-4 self-start">
            <TabsTrigger value="all">All Areas</TabsTrigger>
            {areas.map(area => (
              <TabsTrigger key={area} value={area}>{area}</TabsTrigger>
            ))}
             {areas.length === 0 && <TabsTrigger value="all" disabled>All Areas</TabsTrigger>}
          </TabsList>
          
          <div className="flex-grow overflow-auto pr-2">
            <TabsContent value="all" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredTables.map((table) => (
                  <TableCard key={table.id} table={table} onUpdateStatus={handleUpdateTableStatus} />
                ))}
              </div>
            </TabsContent>
            {areas.map(area => (
              <TabsContent key={area} value={area} className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredTables.filter(table => (table.zone || 'Default Area') === area).map((table) => (
                    <TableCard key={table.id} table={table} onUpdateStatus={handleUpdateTableStatus} />
                  ))}
                </div>
              </TabsContent>
            ))}
            {filteredTables.length === 0 && searchTerm && (
              <div className="text-center py-10">
                <p className="text-xl text-muted-foreground">No tables found matching your criteria.</p>
              </div>
            )}
          </div>
        </Tabs>
      )}
    </div>
  );
}
