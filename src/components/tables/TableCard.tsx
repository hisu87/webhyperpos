
'use client';

import { useRouter } from 'next/navigation';
import type { CafeTable as TableType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Info, Move, Combine, Clock, Utensils, Eye, UserCheck, User as UserIcon, Phone, Calendar as CalendarIcon, StickyNote } from 'lucide-react';

interface TableCardProps {
  table: TableType;
  onUpdateStatus: (tableId: string, newStatus: 'available' | 'cleaning') => Promise<void>;
}

const statusColors: Record<string, string> = {
  available: 'bg-green-500 hover:bg-green-600',
  occupied: 'bg-orange-500 hover:bg-orange-600',
  reserved: 'bg-blue-500 hover:bg-blue-600',
  cleaning: 'bg-yellow-400 hover:bg-yellow-500',
};

const statusTextColors: Record<string, string> = {
  available: 'text-green-50',
  occupied: 'text-orange-50',
  reserved: 'text-blue-50',
  cleaning: 'text-yellow-50',
};

const cardBorderColorMap: Record<string, string> = {
    available: 'border-green-500',
    occupied: 'border-orange-500',
    reserved: 'border-blue-500',
    cleaning: 'border-yellow-400',
};

export function TableCard({ table, onUpdateStatus }: TableCardProps) {
  const router = useRouter();

  const handleTakeOrder = () => {
    router.push(`/dashboard/menu?tableId=${table.id}&tableNumber=${table.tableNumber}`);
  };

  const handleViewOrder = () => {
    if (table.currentOrder?.id) {
      router.push(`/dashboard/orders/${table.currentOrder.id}`);
    }
  };

  const cardBorderColor = cardBorderColorMap[table.status] || 'border-border';

  return (
    <Dialog>
      <Card 
        className={cn(
          "shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col",
          "border-2",
          cardBorderColor
        )}
      >
        <CardHeader className={cn("p-4", statusColors[table.status] || 'bg-muted', statusTextColors[table.status] || 'text-muted-foreground')}>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold">{table.tableNumber}</CardTitle>
            <div className="text-xs px-2 py-1 rounded-full bg-background/20">
              {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
            </div>
          </div>
          <CardDescription className={cn("text-sm", statusTextColors[table.status] || 'text-muted-foreground', "opacity-80")}>
            {table.zone || 'Default Zone'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          {table.status === 'occupied' && <p className="text-sm text-muted-foreground">Order: #{table.currentOrder?.orderNumber || 'Active'}</p>}
          {table.status === 'available' && <p className="text-sm text-green-600">Ready for new guests.</p>}
          {table.status === 'reserved' && <p className="text-sm text-blue-600">Reserved for {table.reservationDetails?.guestName || 'guest'}.</p>}
          {table.status === 'cleaning' && <p className="text-sm text-yellow-600">Being prepared for next guests.</p>}
        </CardContent>
        <CardFooter className="p-2 border-t mt-auto">
          <div className="flex w-full justify-between items-center">
            {table.status === 'available' && (
              <Button onClick={handleTakeOrder} className="flex-grow mr-2"><Utensils className="mr-2 h-4 w-4" /> Take Order</Button>
            )}
            {table.status === 'occupied' && (
              <Button onClick={handleViewOrder} disabled={!table.currentOrder?.id} variant="outline" className="flex-grow mr-2"><Eye className="mr-2 h-4 w-4" /> View Order</Button>
            )}
            {table.status === 'reserved' && (
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-grow mr-2"><UserCheck className="mr-2 h-4 w-4" /> View Reservation</Button>
              </DialogTrigger>
            )}
            {table.status === 'cleaning' && (
              <Button variant="outline" disabled className="flex-grow mr-2"><Clock className="mr-2 h-4 w-4" /> Cleaning...</Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onUpdateStatus(table.id, 'cleaning')} disabled={table.status === 'cleaning'}>
                  <Clock className="mr-2 h-4 w-4" /> Mark as Cleaning
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onUpdateStatus(table.id, 'available')} disabled={table.status === 'available'}>
                  <Utensils className="mr-2 h-4 w-4" /> Mark as Available
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Move className="mr-2 h-4 w-4" /> Move Table
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Combine className="mr-2 h-4 w-4" /> Merge Table
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardFooter>
      </Card>

      {table.reservationDetails && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reservation for Table {table.tableNumber}</DialogTitle>
            <DialogDescription>
              Details for the upcoming reservation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Guest Name</div>
                <div className="font-semibold">{table.reservationDetails.guestName}</div>
              </div>
            </div>
            {table.reservationDetails.guestPhone && (
              <div className="flex items-center gap-4">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Phone</div>
                  <div className="font-semibold">{table.reservationDetails.guestPhone}</div>
                </div>
              </div>
            )}
             <div className="flex items-center gap-4">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Time</div>
                  <div className="font-semibold">{new Date(table.reservationDetails.reservationTime.toDate()).toLocaleString()}</div>
                </div>
              </div>
            {table.reservationDetails.notes && (
              <div className="flex items-start gap-4">
                <StickyNote className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <div className="text-sm text-muted-foreground">Notes</div>
                  <div className="font-semibold">{table.reservationDetails.notes}</div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
