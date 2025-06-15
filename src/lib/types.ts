
// Firestore Timestamp type, assuming you'll import it from 'firebase/firestore' where needed
// For simplicity in this types file, we'll use 'any' or 'Date' as placeholders.
// In actual Firestore operations, use `Timestamp` from 'firebase/firestore'.

// Denormalized map types
export interface DenormalizedTenantRef {
  id: string;
  name?: string; // Optional as some references only need id
}

export interface DenormalizedBranchRef {
  id:string;
  name?: string; // Optional
}

export interface DenormalizedUserRef {
  id: string;
  username?: string;
}

export interface DenormalizedOrderRef {
    id: string;
    orderNumber?: string;
}

export interface DenormalizedPromotionRef {
    id: string;
    code?: string;
}

// 1. Core & Quản lý Truy cập
export interface Tenant {
  id: string; // Document ID
  name: string;
  subscriptionPlan: 'basic' | 'pro' | 'enterprise' | string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface Branch {
  id: string; // Document ID
  name: string;
  location?: string;
  tenant: DenormalizedTenantRef; // { id: string, name: string }
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface User {
  id: string; // Document ID, typically same as firebaseUid for simplicity if created via API
  firebaseUid: string; // UID from Firebase Authentication
  email: string;
  username?: string; // Display name
  role: 'staff' | 'cashier' | 'manager' | 'admin' | string;
  hashedPinCode?: string;
  active: boolean;
  tenant?: { id: string }; // Object containing { id: string }
  branch?: DenormalizedBranchRef; // { id: string, name: string }
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

// 2. Quản lý Thực đơn, Công thức & Bàn
export interface Menu {
  id: string; // Document ID
  name: string;
  isActive: boolean;
  tenant: { id: string }; // Object containing { id: string }
  description?: string; // Added from previous context, confirm if needed
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  // MenuItems will be in a sub-collection
}

export interface MenuItem { // Represents items in /menus/{menuId}/items/{itemId}
  id: string; // Document ID
  name: string;
  category: string;
  price: number;
  unit: string;
  available: boolean;
  // Fields like description, imageUrl, etc., are not in the new strict schema for this sub-collection item.
  // If needed, they could be added or fetched from a "master" MenuItem collection.
  // For now, adhering to the provided schema.
  // `recipe` will be in a sub-collection
}

export interface MenuItemRecipeItem { // Represents items in /menus/{menuId}/items/{itemId}/recipe/{ingredientId}
  // The document ID for these items IS the ingredientId
  quantityNeeded: number;
  unit: string; // e.g., 'gram', 'ml'
  ingredientName: string; // Denormalized
}

export interface CafeTable { // Represents items in /branches/{branchId}/tables/{tableId}
  id: string; // Document ID
  tableNumber: string;
  zone?: string;
  status: 'available' | 'occupied' | 'reserved' | string;
  currentOrder?: DenormalizedOrderRef; // { id: string, orderNumber: string } when occupied
  capacity?: number; // From old schema, added for consideration
  // `branchId` is implicit from the path
}


// 3. Khuyến mãi & Khách hàng thân thiết
export interface Promotion {
  id: string; // Document ID
  name: string;
  code: string; // Customer-facing code
  type: 'percentage' | 'fixed_amount' | string;
  value: number;
  minOrderValue?: number;
  startDate: any; // Timestamp
  endDate: any; // Timestamp
  isActive: boolean;
  tenantId: string; // Reference to Tenant
  createdAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
}

export interface Customer {
  id: string; // Document ID
  name: string;
  phoneNumber: string; // Used for lookup
  email?: string;
  totalPoints: number;
  tenantId: string; // Reference to Tenant
  createdAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
}

// 4. Quản lý Đơn hàng & Thanh toán
export interface Order { // Represents items in /branches/{branchId}/orders/{orderId}
  id: string; // Document ID
  orderNumber: string; // User-friendly order number
  status: 'pending' | 'open' | 'preparing' | 'ready' | 'served' | 'paid' | 'completed' | 'cancelled' | 'refunded' | string;
  type: 'dine-in' | 'takeout' | 'delivery' | string;
  totalAmount: number; // Subtotal before discount
  discount?: number;
  finalAmount: number; // Amount after discount
  user: DenormalizedUserRef; // { id: string, username: string }
  table?: DenormalizedTableRef; // { id: string, tableNumber: string } - Adjusted name
  customer?: DenormalizedCustomerRef; // { id: string, name: string }
  promotion?: DenormalizedPromotionRef; // { id: string, code: string }
  createdAt: any; // Timestamp
  paidAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
  // `branchId` is implicit from path
  // `tenantId` could be denormalized here or fetched via branch if needed often
  // OrderItems will be in a sub-collection
}
// Helper types for denormalized fields in Order
export interface DenormalizedTableRef {
  id: string;
  tableNumber: string;
}
export interface DenormalizedCustomerRef {
  id: string;
  name: string;
}


export interface OrderItem { // Represents items in /branches/{branchId}/orders/{orderId}/items/{orderItemId}
  id: string; // Document ID
  menuItemId: string; // Original MenuItem ID
  menuItemName: string; // Denormalized
  unitPrice: number; // Denormalized price at time of order
  quantity: number;
  note?: string;
  // `orderId` and `branchId` are implicit from path
}

// UI specific type for cart, distinct from persisted OrderItem
export interface CartItem extends MenuItem { // This MenuItem refers to the one from Menu sub-collection
  cartItemId: string; // Unique ID for the item in the cart
  quantityInCart: number; // Renamed from 'quantity' to avoid clash
  notes?: string;
  // selectedOptions?: Record<string, string>; // If options are a feature
  // calculatedPrice: number; // if price can vary with options
}


export interface QRPaymentRequest { // Represents items in /branches/{branchId}/orders/{orderId}/qrPaymentRequests/{requestId}
  id: string; // Document ID
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'failed' | string;
  qrContent: string; // String to render QR code
  expiresAt: any; // Timestamp
  createdAt?: any; // Timestamp
  // `orderId` and `branchId` are implicit from path
}

// 5. Quản lý Kho & Nguyên liệu
export interface Ingredient { // Represents items in /ingredients/{ingredientId}
  id: string; // Document ID
  name: string;
  unit: string; // Base unit: 'ml', 'gram', 'kg', etc.
  lowStockThreshold?: number;
  tenantId: string; // Reference to Tenant
  createdAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
  category?: string; // From previous type
  description?: string; // From previous type
}

export interface BranchInventoryItem { // Represents items in /branches/{branchId}/inventory/{ingredientId}
  // The document ID for these items IS the ingredientId
  currentQuantity: number; // Aggregated, updated by Cloud Function
  ingredientName: string; // Denormalized
  unit: string; // Denormalized
  updatedAt: any; // Timestamp
  // `branchId` and `ingredientId` are implicit from path
}

export interface StockMovement { // Represents items in /branches/{branchId}/stockMovements/{movementId}
  id: string; // Document ID
  ingredientId: string; // Reference to Ingredient
  quantity: number; // Positive for IN, negative for OUT
  type: 'purchase_in' | 'sale_out' | 'adjustment' | 'spoilage_out' | 'transfer_in' | 'transfer_out' | string;
  source?: string; // e.g., orderId, purchaseOrderId, reason for adjustment
  createdAt: any; // Timestamp
  userId?: string; // User who performed/recorded
  // `branchId` is implicit from path
}

// 6. Báo cáo & Thông báo
export interface ShiftReport { // Represents items in /branches/{branchId}/shiftReports/{reportId}
  id: string; // Document ID
  userId: string; // Staff member ID
  username: string; // Denormalized staff member name
  startTime: any; // Timestamp
  endTime?: any; // Timestamp
  status: 'active' | 'closed' | string;
  finalRevenue?: number; // Aggregated, updated by Cloud Function
  totalCashIn?: number; // Aggregated
  totalCardIn?: number; // Aggregated
  totalQrIn?: number; // Aggregated
  totalTransactions?: number; // Aggregated
  notes?: string;
  createdAt?: any; // Timestamp
  // `branchId` is implicit from path
}

export interface Notification { // Represents items in /notifications/{notificationId}
  id: string; // Document ID
  type: 'low_stock_warning' | 'new_promotion' | string;
  message: string;
  status: 'unread' | 'read' | string;
  branchId?: string; // Optional, if notification is branch-specific
  tenantId?: string; // Optional, if notification is tenant-specific
  targetUserIds?: string[]; // Specific users to notify
  createdAt: any; // Timestamp
  relatedEntity?: { type: string, id: string }; // e.g. { type: "ingredient", id: "ing123" }
}


// Client-side specific types (not directly from Firestore schema but used in UI)
export interface HistoricalSale {
  date: string; // YYYY-MM-DD
  sales: number;
}

export interface PredictedSale {
  date: string; // YYYY-MM-DD
  predictedSales: number;
}
