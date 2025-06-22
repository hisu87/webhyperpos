
import type { Tenant, Branch, MenuItem as NewMenuItemType, CafeTable, ShiftReport as NewShiftReportType } from './types';
import { LayoutGrid, ShoppingBag, Users, BarChart3, TrendingUp, Settings, FileText, Bot } from 'lucide-react';

export const APP_NAME = 'Hyper POS';

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

// NOTE: Mock data below might be outdated due to schema changes.
// The seeding script (src/lib/seed.ts) is the preferred way to generate sample data.

export const MOCK_TENANTS: Tenant[] = [
  // { id: 'tenant1', name: 'The Cozy Bean Corp.', subscriptionPlan: 'pro', createdAt: new Date(), updatedAt: new Date() },
  // { id: 'tenant2', name: 'Urban Grind Inc.', subscriptionPlan: 'basic', createdAt: new Date(), updatedAt: new Date() },
];

export const MOCK_BRANCHES: Branch[] = [
  // { id: 'branch1a', name: 'Downtown Roastery', tenant: {id: 'tenant1', name: 'The Cozy Bean Corp.'}, createdAt: new Date(), updatedAt: new Date() },
  // { id: 'branch1b', name: 'Suburb Cafe', tenant: {id: 'tenant1', name: 'The Cozy Bean Corp.'}, createdAt: new Date(), updatedAt: new Date() },
  // { id: 'branch2a', name: 'City Center Express', tenant: {id: 'tenant2', name: 'Urban Grind Inc.'}, createdAt: new Date(), updatedAt: new Date() },
];

// The structure of MenuItem has changed significantly. It's now a sub-collection of a Menu.
// This MOCK_MENU_ITEMS is for the old structure and will likely cause errors.
// Refer to the seeding script for how to create menus and their items.
export const MOCK_MENU_ITEMS_OLD_STRUCTURE: any[] = [
  { id: '1', name: 'Espresso', price: 2.50, category: 'Coffee', imageUrl: 'https://placehold.co/300x200.png', description: 'Strong black coffee.', dataAiHint: "espresso coffee" },
  { id: '2', name: 'Latte', price: 3.50, category: 'Coffee', imageUrl: 'https://placehold.co/300x200.png', description: 'Espresso with steamed milk.', dataAiHint: "latte art" },
];

// CafeTable structure has changed. It's now a sub-collection of a Branch.
export const MOCK_TABLES_OLD_STRUCTURE: any[] = [
  { id: 'T1', name: 'Table 1', status: 'available', capacity: 2, area: 'Indoor' },
  { id: 'T2', name: 'Table 2', status: 'occupied', capacity: 4, area: 'Indoor' },
];

// ShiftReport structure has changed. It's now a sub-collection of a Branch.
export const MOCK_SHIFT_REPORT_OLD_STRUCTURE: any = {
  id: 'SR1',
  shiftStart: new Date(new Date().setDate(new Date().getDate() -1)),
  shiftEnd: new Date(),
  totalRevenue: 1250.75, // Now finalRevenue, and paymentMethods structure is different
  transactionsCount: 85, // Now totalTransactions
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
