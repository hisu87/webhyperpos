import type { Table } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Utensils, Info, Move, Combine, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TableCardProps {
  table: Table;
  onSelectTable: (tableId: string) => void;
}

const statusColors: Record<Table['status'], string> = {
  available: 'bg-green-500 hover:bg-green-600',
  occupied: 'bg-orange-500 hover:bg-orange-600',
  reserved: 'bg-blue-500 hover:bg-blue-600',
  cleaning: 'bg-yellow-400 hover:bg-yellow-500',
};

const statusTextColors: Record<Table['status'], string> = {
  available: 'text-green-50',
  occupied: 'text-orange-50',
  reserved: 'text-blue-50',
  cleaning: 'text-yellow-50',
};

export function TableCard({ table, onSelectTable }: TableCardProps) {
  return (
    <Card 
      className={cn(
        "shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden",
        "border-2",
        table.status === 'available' && 'border-green-500',
        table.status === 'occupied' && 'border-orange-500',
        table.status === 'reserved' && 'border-blue-500',
        table.status === 'cleaning' && 'border-yellow-400',
      )}
    >
      <CardHeader className={cn("p-4", statusColors[table.status], statusTextColors[table.status])}>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">{table.name}</CardTitle>
          <div className="text-xs px-2 py-1 rounded-full bg-background/20">
            {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
          </div>
        </div>
        <CardDescription className={cn("text-sm", statusTextColors[table.status], "opacity-80")}>
          {table.area} - Capacity: {table.capacity}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {/* Could display current order info here if occupied */}
        {table.status === 'occupied' && <p className="text-sm text-muted-foreground">Order active...</p>}
        {table.status === 'available' && <p className="text-sm text-green-600">Ready for guests.</p>}
        {table.status === 'reserved' && <p className="text-sm text-blue-600">Reserved for later.</p>}
        {table.status === 'cleaning' && <p className="text-sm text-yellow-600">Being prepared.</p>}
      </CardContent>
      <CardFooter className="p-4 border-t">
        <div className="flex w-full justify-between items-center">
          <Button 
            variant={table.status === 'available' ? 'default' : 'outline'}
            onClick={() => onSelectTable(table.id)} 
            className="flex-grow mr-2"
          >
            {table.status === 'available' ? 'Take Order' : 'View Details'}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Info className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => alert(`Moving table ${table.name}`)}>
                <Move className="mr-2 h-4 w-4" /> Move Table
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert(`Merging table ${table.name}`)}>
                <Combine className="mr-2 h-4 w-4" /> Merge Table
              </DropdownMenuItem>
               <DropdownMenuItem onClick={() => alert(`Changing status for table ${table.name}`)}>
                <Clock className="mr-2 h-4 w-4" /> Change Status
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}
