import type { MenuItem, Table, ShiftReport, Tenant, Branch } from './types';
import { LayoutGrid, ShoppingBag, Users, BarChart3, TrendingUp, Settings, FileText, Bot } from 'lucide-react';

export const APP_NAME = 'CoffeeOS';

export const NAV_LINKS = [
  { href: '/dashboard/menu', label: 'Order & Menu', icon: ShoppingBag },
  { href: '/dashboard/tables', label: 'Tables', icon: LayoutGrid },
  { href: '/dashboard/reports', label: 'Shift Reports', icon: FileText },
  { href: '/dashboard/forecasting', label: 'Sales Forecast', icon: Bot },
  // Future links:
  // { href: '/inventory', label: 'Inventory', icon: Package },
  // { href: '/staff', label: 'Staff', icon: Users },
  // { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  // { href: '/settings', label: 'Settings', icon: Settings },
];

export const MOCK_TENANTS: Tenant[] = [
  { id: 'tenant1', name: 'The Cozy Bean Corp.' },
  { id: 'tenant2', name: 'Urban Grind Inc.' },
];

export const MOCK_BRANCHES: Branch[] = [
  { id: 'branch1a', name: 'Downtown Roastery', tenantId: 'tenant1' },
  { id: 'branch1b', name: 'Suburb Cafe', tenantId: 'tenant1' },
  { id: 'branch2a', name: 'City Center Express', tenantId: 'tenant2' },
];


export const MOCK_MENU_ITEMS: MenuItem[] = [
  { id: '1', name: 'Espresso', price: 2.50, category: 'Coffee', imageUrl: 'https://placehold.co/300x200.png', description: 'Strong black coffee.', dataAiHint: "espresso coffee" },
  { id: '2', name: 'Latte', price: 3.50, category: 'Coffee', imageUrl: 'https://placehold.co/300x200.png', description: 'Espresso with steamed milk.', dataAiHint: "latte art" },
  { id: '3', name: 'Cappuccino', price: 3.50, category: 'Coffee', imageUrl: 'https://placehold.co/300x200.png', description: 'Espresso, steamed milk, and foam.', dataAiHint: "cappuccino cup" },
  { id: '4', name: 'Croissant', price: 2.00, category: 'Pastries', imageUrl: 'https://placehold.co/300x200.png', description: 'Buttery and flaky.', dataAiHint: "croissant pastry" },
  { id: '5', name: 'Muffin', price: 2.25, category: 'Pastries', imageUrl: 'https://placehold.co/300x200.png', description: 'Blueberry or Chocolate Chip.', dataAiHint: "muffin breakfast" },
  { id: '6', name: 'Orange Juice', price: 3.00, category: 'Drinks', imageUrl: 'https://placehold.co/300x200.png', description: 'Freshly squeezed.', dataAiHint: "orange juice" },
  { id: '7', name: 'Iced Tea', price: 2.75, category: 'Drinks', imageUrl: 'https://placehold.co/300x200.png', description: 'Refreshing black or green tea.', dataAiHint: "iced tea" },
  { id: '8', name: 'Avocado Toast', price: 6.50, category: 'Food', imageUrl: 'https://placehold.co/300x200.png', description: 'Sourdough with fresh avocado.', dataAiHint: "avocado toast" },
];

export const MOCK_TABLES: Table[] = [
  { id: 'T1', name: 'Table 1', status: 'available', capacity: 2, area: 'Indoor' },
  { id: 'T2', name: 'Table 2', status: 'occupied', capacity: 4, area: 'Indoor' },
  { id: 'T3', name: 'Table 3', status: 'reserved', capacity: 4, area: 'Indoor' },
  { id: 'P1', name: 'Patio 1', status: 'available', capacity: 2, area: 'Outdoor' },
  { id: 'P2', name: 'Patio 2', status: 'cleaning', capacity: 3, area: 'Outdoor' },
  { id: 'C1', name: 'Counter 1', status: 'available', capacity: 1, area: 'Counter' },
];

export const MOCK_SHIFT_REPORT: ShiftReport = {
  id: 'SR1',
  shiftStart: new Date(new Date().setDate(new Date().getDate() -1)),
  shiftEnd: new Date(),
  totalRevenue: 1250.75,
  transactionsCount: 85,
  paymentMethods: {
    cash: 450.25,
    card: 700.50,
    momo: 100.00,
  },
};

export const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash' },
  { id: 'card', name: 'Card' },
  { id: 'momo', name: 'Momo' },
  { id: 'zalopay', name: 'ZaloPay' },
  { id: 'vnpay', name: 'VNPay' },
  { id: 'points', name: 'Loyalty Points' },
  { id: 'voucher', name: 'Voucher' },
];
