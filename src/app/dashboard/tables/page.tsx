'use client';

import React, { useState } from 'react';
import { TableCard } from '@/components/tables/TableCard';
import { MOCK_TABLES } from '@/lib/constants';
import type { Table as TableType } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";

export default function TablesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const handleSelectTable = (tableId: string) => {
    const table = MOCK_TABLES.find(t => t.id === tableId);
    toast({ title: `Table ${table?.name} Selected`, description: `Status: ${table?.status}` });
    // Navigate to order page or show details modal
  };

  const areas = Array.from(new Set(MOCK_TABLES.map(table => table.area)));
  
  const filteredTables = MOCK_TABLES.filter(table => 
    table.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 bg-card rounded-lg shadow mb-4 sticky top-0 z-10">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Search tables (name, area, status)..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={() => alert("Add new table functionality")}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Table
        </Button>
      </div>
      
      <Tabs defaultValue={areas[0] || 'all'} className="flex-grow flex flex-col">
        <TabsList className="mb-4 self-start">
          <TabsTrigger value="all">All Areas</TabsTrigger>
          {areas.map(area => (
            <TabsTrigger key={area} value={area}>{area}</TabsTrigger>
          ))}
        </TabsList>
        
        <div className="flex-grow overflow-auto pr-2">
          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredTables.map((table) => (
                <TableCard key={table.id} table={table} onSelectTable={handleSelectTable} />
              ))}
            </div>
          </TabsContent>
          {areas.map(area => (
            <TabsContent key={area} value={area} className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredTables.filter(table => table.area === area).map((table) => (
                  <TableCard key={table.id} table={table} onSelectTable={handleSelectTable} />
                ))}
              </div>
            </TabsContent>
          ))}
           {filteredTables.length === 0 && (
            <div className="text-center py-10">
              <p className="text-xl text-muted-foreground">No tables found matching your criteria.</p>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
