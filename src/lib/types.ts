
export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

// Core Entities based on new schema

export interface Tenant {
  id: string; // UUID
  name: string; // TEXT, required
  subscriptionPlan?: 'basic' | 'pro' | 'enterprise' | string; // TEXT
  createdAt: Date; // TIMESTAMP
  updatedAt: Date; // TIMESTAMP
}

export interface Branch {
  id: string; // UUID
  tenantId: string; // UUID, FK to Tenant
  name: string; // TEXT, required
  location?: string; // TEXT
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string; // UUID
  tenantId: string; // UUID, FK to Tenant
  branchId: string; // UUID, FK to Branch
  username: string; // TEXT, unique in branch
  role: 'staff' | 'cashier' | 'manager' | 'admin' | string; // TEXT
  pinCode?: string; // TEXT, secured (hashed)
  active: boolean; // BOOLEAN, default true
  email?: string; // For Firebase Auth linkage
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CafeTable {
  id: string; // UUID
  branchId: string; // UUID, FK to Branch
  tableNumber: string; // TEXT, e.g., "B01" (replaces old 'name')
  zone?: string; // TEXT, e.g., "A", "B", "Outdoor" (replaces old 'area')
  status: TableStatus; // Kept from original 'Table' type
  capacity: number; // Kept from original 'Table' type
  active: boolean; // BOOLEAN, default true
  currentOrderId?: string; // Optional: to link to an active order
  createdAt: Date;
  updatedAt: Date;
}

export interface Menu {
  id: string; // UUID
  tenantId: string; // UUID, FK to Tenant
  name: string; // TEXT, e.g., "Menu Tết"
  version: number; // INTEGER, default 1
  active: boolean; // BOOLEAN
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuOptionChoice {
  id: string; // e.g. "choice_small", "choice_almond_milk"
  name: string; // e.g., "Small", "Almond Milk"
  additionalPrice?: number; // Optional price adjustment for this specific choice
}

export interface MenuOption {
  id: string; // e.g. "option_size", "option_milk_type"
  name: string; // Display name e.g., "Size", "Milk Type"
  description?: string;
  choices: MenuOptionChoice[];
  type: 'single' | 'multiple'; // Whether user can select one or multiple choices
  required: boolean;
}

export interface MenuItem {
  id: string; // UUID
  menuId: string; // UUID, FK to Menu
  name: string; // TEXT
  description?: string;
  category: string; // TEXT, e.g., "Coffee", "Pastries"
  price: number; // DECIMAL(10,2)
  unit: string; // TEXT, e.g., "ly", "chai", "đĩa"
  imageUrl?: string;
  options?: MenuItemOption[]; // Array of configurable options
  dataAiHint?: string; // For AI image search
  available: boolean; // Is the item currently available for ordering
  tags?: string[]; // e.g., "vegetarian", "new", "spicy"
  displayOrder?: number; // To control order within a category
  createdAt: Date;
  updatedAt: Date;
}

// Client-side cart item structure
export interface OrderItem extends MenuItem {
  cartItemId: string; // Unique ID for the item in the cart
  quantity: number;
  notes?: string;
  // Record of selected optionId to choiceId (or choiceName if simpler for UI)
  selectedOptions?: Record<string, string>; // e.g. { "option_size": "choice_large", "option_milk": "choice_almond" }
  calculatedPrice: number; // MenuItem.price + sum of selected options' additionalPrice
}


export interface Order {
  id: string; // UUID
  tenantId: string; // UUID, FK to Tenant
  branchId: string; // UUID, FK to Branch
  userId: string; // UUID, FK to User (creator)
  customerId?: string; // Optional FK to a customer profile
  tableId?: string; // UUID, FK to CafeTable (optional for takeout/delivery)
  orderNumber?: string; // Human-readable order number (e.g., daily sequence)
  status: 'pending' | 'open' | 'preparing' | 'ready' | 'served' | 'paid' | 'completed' | 'cancelled' | 'refunded' | string; // TEXT, default 'open' or 'pending'
  type: 'dine-in' | 'takeout' | 'delivery';
  subtotalAmount: number; // Sum of OrderLineItem totalPrices before discounts/taxes
  discountAmount?: number;
  taxAmount?: number;
  serviceChargeAmount?: number;
  totalAmount: number; // DECIMAL(10,2), final amount to be paid
  paymentMethod?: string; // TEXT, e.g., "cash", "qr", "card_visa_1234"
  paymentTransactionId?: string; // ID from payment gateway
  notes?: string; // General notes for the order
  createdAt: Date; // TIMESTAMP
  updatedAt: Date; // TIMESTAMP
  completedAt?: Date; // When order reached a final state (paid/completed/cancelled)
  // OrderLineItems can be a subcollection in Firestore or an array in the document.
  // If an array, it might be 'items: OrderLineItem[];'
}

export interface OrderLineItem {
  id: string; // Document ID if subcollection, or unique string if array element
  // orderId is implicit if subcollection, explicit if separate collection
  menuItemId: string; // UUID, FK to MenuItem
  menuItemName: string; // Denormalized
  quantity: number; // INTEGER
  unitPrice: number; // Price of one unit of the menu item at the time of order (before options)
  selectedOptions?: Array<{
    optionId: string;
    optionName: string;
    choiceId: string;
    choiceName: string;
    additionalPrice?: number;
  }>; // Denormalized selected options
  itemSubtotal: number; // quantity * (unitPrice + sum of selected options' additionalPrice)
  notes?: string; // TEXT, e.g., "extra_shot", "no_ice"
  // status?: 'pending' | 'preparing' | 'ready' | 'served' | 'cancelled'; // Optional: per-item status
}


export interface Ingredient {
  id: string; // UUID
  tenantId: string; // UUID, FK to Tenant
  name: string; // TEXT, e.g., "Sữa đặc"
  description?: string;
  category?: string; // e.g., "Dairy", "Produce", "Dry Goods"
  unit: string; // TEXT, e.g., "ml", "gram", "kg", "item"
  supplierId?: string; // Optional FK to a Supplier entity
  averageCost?: number; // Average purchase cost per unit
  lowStockThreshold?: number; // DECIMAL(10,2), default 0
  isPerishable?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string; // Could be `branchId_ingredientId` or a unique UUID
  branchId: string; // UUID, FK to Branch
  ingredientId: string; // UUID, FK to Ingredient
  quantity: number; // DECIMAL(10,2), current stock level
  unit: string; // Denormalized from Ingredient for easier display
  lastStocktakeDate?: Date;
  notes?: string;
  lastUpdatedAt: Date; // TIMESTAMP
}

export interface RecipeItem {
  id: string; // UUID, or could be part of MenuItem subcollection
  // menuItemId is implicit if subcollection, or explicit: string;
  ingredientId: string; // UUID, FK to Ingredient
  quantity: number; // DECIMAL(10,2), amount of ingredient needed for 1 unit of the MenuItem
  unit: string; // Denormalized from Ingredient, e.g. "gram", "ml"
  notes?: string;
}

export interface StockMovement {
  id: string; // UUID
  branchId: string; // UUID, FK to Branch
  ingredientId: string; // UUID, FK to Ingredient
  userId: string; // UUID, FK to User who performed/recorded movement
  quantity: number; // DECIMAL(10,2), positive for IN, negative for OUT
  unit: string; // Denormalized from Ingredient
  type: 'purchase_in' | 'transfer_in' | 'production_out' | 'sale_out' | 'spoilage_out' | 'transfer_out' | 'stocktake_adjustment' | string; // TEXT
  sourceOrDestination?: string; // e.g., Supplier name, other Branch ID, reason for spoilage
  referenceId?: string; // e.g., PurchaseOrder ID, Order ID, Transfer ID
  notes?: string;
  createdAt: Date; // TIMESTAMP
}


// Existing types for specific features - kept as they are not directly part of the new core schema
export interface ShiftReport {
  id: string;
  shiftStart: Date;
  shiftEnd: Date;
  totalRevenue: number;
  transactionsCount: number;
  paymentMethods: Record<string, number>; // e.g., { cash: 500, card: 1200 }
  userId: string; // User who owns/closed the shift
  branchId: string;
  notes?: string;
}

export interface HistoricalSale {
  date: string; // YYYY-MM-DD
  sales: number;
}

export interface PredictedSale {
  date: string; // YYYY-MM-DD
  predictedSales: number;
}
