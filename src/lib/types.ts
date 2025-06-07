
export interface Tenant {
  id: string;
  name: string;
}

export interface Branch {
  id: string;
  name: string;
  tenantId: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  description?: string;
  options?: MenuOption[]; // e.g., size, milk type
}

export interface MenuOption {
  name: string;
  choices: string[];
  additionalPrice?: number;
}

export interface OrderItem extends MenuItem {
  quantity: number;
  notes?: string;
  selectedOptions?: Record<string, string>;
}

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

export interface Table {
  id: string;
  name: string;
  status: TableStatus;
  capacity: number;
  area: string; // e.g., 'Indoor', 'Outdoor'
}

export interface ShiftReport {
  id: string;
  shiftStart: Date;
  shiftEnd: Date;
  totalRevenue: number;
  transactionsCount: number;
  paymentMethods: Record<string, number>; // e.g., { cash: 500, card: 1200 }
}

export interface HistoricalSale {
  date: string; // YYYY-MM-DD
  sales: number;
}

export interface PredictedSale {
  date: string; // YYYY-MM-DD
  predictedSales: number;
}
