
// src/lib/types.ts

// Firestore Timestamp type, assuming you'll import it from 'firebase/firestore' where needed
// For simplicity in this types file, we'll use 'any' or 'Date' as placeholders.
// In actual Firestore operations, use `Timestamp` from 'firebase/firestore'.

// Denormalized map types
export interface DenormalizedTenantRef {
  id: string;
  name: string; // Tên bắt buộc khi phi chuẩn hóa để luôn có thể hiển thị
}

export interface DenormalizedBranchRef {
  id:string;
  name: string; // Tên bắt buộc khi phi chuẩn hóa
}

export interface DenormalizedUserRef {
  id: string;
  username: string; // Tên đăng nhập bắt buộc khi phi chuẩn hóa
}

export interface DenormalizedOrderRef {
    id: string;
    orderNumber: string; // Số đơn hàng bắt buộc khi phi chuẩn hóa
}

export interface DenormalizedPromotionRef {
    id: string;
    code: string; // Mã khuyến mãi bắt buộc khi phi chuẩn hóa
    name?: string; // Tên chương trình (optional)
}

export interface DenormalizedMenuItemRef {
    id: string;
    name: string;
    price: number; // Giá tại thời điểm tham chiếu (denormalized)
    unit: string; // Đơn vị tính (denormalized)
}

export interface DenormalizedIngredientRef {
    id: string;
    name: string;
    unit: string;
}

export interface DenormalizedMenuRef {
    id: string;
    name: string;
}

export interface DenormalizedTableRef {
  id: string;
  tableNumber: string;
}
export interface DenormalizedCustomerRef {
  id: string;
  name: string;
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
  tenant?: DenormalizedTenantRef; // Object containing { id: string, name: string }
  branch?: DenormalizedBranchRef; // { id: string, name: string }
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

// 2. Quản lý Thực đơn, Công thức & Bàn
export interface Menu {
  id: string; // Document ID
  name: string;
  version: string; // Thêm trường version từ seed script
  isActive: boolean;
  tenant: DenormalizedTenantRef; // Object containing { id: string, name: string }
  description?: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  // MenuItems will be in a sub-collection
}

export interface MenuItem { // Represents items in /menus/{menuId}/items/{itemId}
  id: string; // Document ID
  menu: DenormalizedMenuRef; // Thêm reference tới menu
  name: string;
  category: string;
  price: number;
  unit: string;
  available: boolean;
  imageUrl?: string; // Thêm trường imageUrl từ seed script
  tags?: string[]; // Thêm trường tags từ seed script
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  // `recipe` will be in a sub-collection 'recipes'
}


export interface MenuItemRecipeItem { // Represents items in /menus/{menuId}/items/{itemId}/recipes/{ingredientId}
  id: string; // Document ID (this *is* the ingredientId)
  menuItem: DenormalizedMenuItemRef; // Reference to menu item
  ingredient: DenormalizedIngredientRef; // Reference to ingredient
  quantityNeeded: number;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface CafeTable { // Represents items in /branches/{branchId}/tables/{tableId}
  id: string; // Document ID
  tableNumber: string;
  zone?: string;
  capacity?: number; // Thêm lại từ seed script
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | string; // Thêm 'cleaning'
  isActive: boolean; // Thêm từ seed script
  currentOrder?: DenormalizedOrderRef; // { id: string, orderNumber: string } when occupied
  branch: DenormalizedBranchRef; // Thêm reference tới branch
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  reservationDetails?: {
    guestName: string;
    guestPhone?: string;
    reservationTime: any; // Timestamp
    notes?: string;
  };
}


// 3. Khuyến mãi & Khách hàng thân thiết
export interface Promotion { // Old: DiscountPromotions
  id: string; // Document ID
  name: string;
  code: string; // Customer-facing code
  type: 'percentage' | 'fixed_amount' | string;
  value: number;
  minOrderValue?: number;
  startDate: any; // Timestamp
  endDate: any; // Timestamp
  isActive: boolean;
  appliesTo: 'all_orders' | 'specific_items' | string; // Thêm trường appliesTo từ seed script
  tenant: DenormalizedTenantRef; // { id: string, name: string } - Thay thế tenantId
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface CustomerLoyalty { // Đổi tên từ Customer cho rõ ràng
  id: string; // Document ID
  name: string;
  phoneNumber: string; // Used for lookup
  email?: string;
  totalPoints: number;
  tenant: DenormalizedTenantRef; // { id: string, name: string } - Thay thế tenantId
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

// 4. Quản lý Đơn hàng & Thanh toán
export interface Order { // Represents items in /branches/{branchId}/orders/{orderId}
  id: string; // Document ID
  orderNumber: string; // User-friendly order number
  status: 'pending' | 'open' | 'preparing' | 'ready' | 'served' | 'paid' | 'completed' | 'cancelled' | 'refunded' | string;
  type: 'dine-in' | 'takeout' | 'delivery' | string;
  totalAmount: number; // Tổng số tiền đơn hàng (đã tính giảm giá, thuế...)
  discount?: number; // Giá trị giảm giá
  finalAmount: number; // Số tiền cuối cùng sau giảm giá và thuế
  user: DenormalizedUserRef; // { id: string, username: string }
  table?: DenormalizedTableRef; // { id: string, tableNumber: string }
  customer?: DenormalizedCustomerRef; // { id: string, name: string }
  promotion?: DenormalizedPromotionRef; // { id: string, code: string }
  tenant: DenormalizedTenantRef; // THÊM: Phi chuẩn hóa thông tin tenant
  branch: DenormalizedBranchRef; // THÊM: Phi chuẩn hóa thông tin branch
  createdAt: any; // Timestamp
  paidAt?: any; // Timestamp
  updatedAt: any; // Timestamp
  // OrderItems will be in a sub-collection
}


export interface OrderItem { // Represents items in /branches/{branchId}/orders/{orderId}/items/{orderItemId}
  id: string; // Document ID (local ID for UI, UUID for Firestore)
  menuItem: DenormalizedMenuItemRef; // Reference to original MenuItem with its denormalized name, price, unit
  quantity: number;
  note?: string;
  createdAt?: any; // Timestamp
  updatedAt?: any; // Timestamp
  // Compatibility with old structure that had price and name directly
  price?: number; // Old: unitPrice
  name?: string; // Old: menuItemName
  menuItemId?: string; // Old, now part of DenormalizedMenuItemRef.id
  unitPrice?: number; // Old, now part of DenormalizedMenuItemRef.price
  menuItemName?: string; // Old, now part of DenormalizedMenuItemRef.name
}


export interface QRPaymentRequest { // Represents items in /branches/{branchId}/orders/{orderId}/qrPaymentRequests/{requestId}
  id: string; // Document ID
  order: DenormalizedOrderRef; // Reference to Order
  amount: number;
  status: 'pending' | 'paid' | 'expired' | 'failed' | string;
  qrContent: string; // String to render QR code
  expiresAt: any; // Timestamp
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  branch: DenormalizedBranchRef; // Thêm reference tới branch
  tenant: DenormalizedTenantRef; // Thêm reference tới tenant
}

// 5. Quản lý Kho & Nguyên liệu
export interface Ingredient { // Represents items in /ingredients/{ingredientId}
  id: string; // Document ID
  name: string;
  unit: string; // Base unit: 'ml', 'gram', 'kg', etc.
  lowStockThreshold?: number;
  tenantId: string; // Reference to Tenant
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  category?: string; // Thêm từ seed script
  description?: string; // Thêm từ seed script
}

export interface BranchInventoryItem { // Represents items in /branches/{branchId}/inventory/{ingredientId}
  id: string; // Document ID (this *is* the ingredientId)
  branch: DenormalizedBranchRef; // Reference to branch
  ingredient: DenormalizedIngredientRef; // Reference to ingredient
  currentQuantity: number; // Aggregated, updated by Cloud Function
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface StockMovement { // Represents items in /branches/{branchId}/stockMovements/{movementId}
  id: string; // Document ID
  ingredient: DenormalizedIngredientRef; // Reference to Ingredient
  quantity: number; // Positive for IN, negative for OUT
  type: 'purchase_in' | 'sale_out' | 'adjustment' | 'spoilage_out' | 'transfer_in' | 'transfer_out' | string;
  source?: string; // e.g., orderId, purchaseOrderId, reason for adjustment
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  user?: DenormalizedUserRef; // User who performed/recorded
  branch: DenormalizedBranchRef; // Thêm reference tới branch
}

// 6. Báo cáo & Thông báo
export interface ShiftReport { // Represents items in /branches/{branchId}/shiftReports/{reportId}
  id: string; // Document ID
  user: DenormalizedUserRef; // Staff member ID và username
  startTime: any; // Timestamp
  endTime?: any; // Timestamp
  status: 'active' | 'closed' | string;
  finalRevenue?: number; // Aggregated, updated by Cloud Function
  totalCashIn?: number; // Aggregated
  totalCardIn?: number; // Aggregated
  totalQrIn?: number; // Aggregated
  totalTransactions?: number; // Aggregated
  notes?: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  branch: DenormalizedBranchRef; // Thêm reference tới branch
  // Old fields for compatibility if needed, to be phased out:
  userId?: string;
  username?: string;
}

export interface Notification { // Represents items in /notifications/{notificationId}
  id: string; // Document ID
  type: 'low_stock_warning' | 'new_promotion' | string;
  message: string;
  status: 'unread' | 'read' | string;
  branch?: DenormalizedBranchRef; // Optional, if notification is branch-specific
  tenant?: DenormalizedTenantRef; // Optional, if notification is tenant-specific
  targetUserIds?: string[]; // Specific users to notify
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
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

// Type used in UI for order items before saving (might be slightly different from persisted OrderItem)
// This is an example, you might need to adjust based on UI needs
export interface CartItem extends MenuItem {
    cartItemId: string; // Unique ID for the item *in the cart*
    quantity: number; // Quantity of this item in the cart
    // notes?: string; // If item-specific notes are added in cart
}

// Note: Payment collection was mentioned in review but not in the final types provided.
// If you have a top-level `payments` collection, its type definition would go here.
// Example:
// export interface Payment {
//   id: string;
//   order: DenormalizedOrderRef;
//   branch?: DenormalizedBranchRef;
//   tenant?: DenormalizedTenantRef;
//   amount: number;
//   method: string; // e.g., 'cash', 'card', 'qr_code_vnpay'
//   status: 'pending' | 'successful' | 'failed' | string;
//   transactionId?: string; // From payment gateway
//   createdAt: any; // Timestamp
//   updatedAt: any; // Timestamp
// }

