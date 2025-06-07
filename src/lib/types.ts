

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

// Core Entities based on the provided schema

export interface Tenant {
  id: string; // UUID (Primary Key)
  name: string; // TEXT (Tên doanh nghiệp/cửa hàng, bắt buộc nhập)
  subscriptionPlan?: string; // TEXT (Loại gói dịch vụ sử dụng: basic, pro, enterprise...)
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface Branch {
  id: string; // UUID (Primary Key)
  tenantId: string; // UUID (Foreign Key to Tenant)
  name: string; // TEXT (Tên chi nhánh, bắt buộc nhập)
  location?: string; // TEXT (Địa chỉ chi nhánh)
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface User {
  id: string; // UUID (Primary Key)
  tenantId?: string; // UUID (Foreign Key to Tenant) - Optional for users not yet assigned
  branchId?: string; // UUID (Foreign Key to Branch) - Optional for users not yet assigned
  username?: string; // TEXT (Tên đăng nhập, duy nhất trong một chi nhánh) - Optional
  role?: 'staff' | 'cashier' | 'manager' | 'admin' | 'customer' | string; // TEXT (Vai trò người dùng) - Optional, 'customer' for general sign-ins
  hashedPinCode?: string; // TEXT (Mã PIN đăng nhập POS, bảo mật)
  active: boolean; // BOOLEAN (Trạng thái hoạt động của tài khoản, mặc định: true)
  email?: string; // For Firebase Auth linkage
  displayName?: string;
  photoURL?: string;
  firebaseUid?: string; // UID from Firebase Authentication (e.g., Google Sign-In)
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface Menu {
  id: string; // UUID (Primary Key)
  tenantId: string; // UUID (Foreign Key to Tenant)
  name: string; // TEXT (Tên menu, ví dụ: "Menu Tết", "Menu Mùa Hè")
  version: number; // INTEGER (Phiên bản của menu, mặc định là 1)
  isActive: boolean; // BOOLEAN (Trạng thái menu có đang được sử dụng hay không)
  description?: string;
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface MenuItem {
  id: string; // UUID (Primary Key)
  menuId: string; // UUID (Foreign Key to Menu)
  name: string; // TEXT (Tên món ăn/uống)
  description?: string;
  category: string; // TEXT (Phân loại món: cà phê, trà sữa...)
  price: number; // DECIMAL(10,2) (Giá bán của món)
  unit: string; // TEXT (Đơn vị tính: ly, chai, đĩa...)
  imageUrl?: string; // TEXT
  dataAiHint?: string; // For AI image search
  available: boolean; // Is the item currently available for ordering
  tags?: string[]; // e.g., "vegetarian", "new", "spicy"
  displayOrder?: number; // To control order within a category
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface Ingredient {
  id: string; // UUID (Primary Key)
  tenantId: string; // UUID (Foreign Key to Tenant)
  name: string; // TEXT (Tên nguyên liệu: Sữa đặc, cà phê...)
  description?: string;
  category?: string; // e.g., "Dairy", "Produce", "Dry Goods"
  unit: string; // TEXT (Đơn vị tính: ml, gram, chai...)
  supplierId?: string; // Optional FK to a Supplier entity
  averageCost?: number; // Average purchase cost per unit
  lowStockThreshold?: number; // DECIMAL(10,2) (Ngưỡng cảnh báo khi tồn kho thấp, mặc định 0)
  isPerishable?: boolean;
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface Recipe {
  id: string; // UUID (Primary Key)
  menuItemId: string; // UUID (Foreign Key to MenuItem)
  ingredientId: string; // UUID (Foreign Key to Ingredient)
  quantityNeeded: number; // DECIMAL(10,2) (Số lượng nguyên liệu cần cho 1 đơn vị món)
  unit?: string; // Denormalized from Ingredient, e.g. "gram", "ml" (useful to keep)
  notes?: string;
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface Inventory {
  id: string; // UUID (Primary Key)
  branchId: string; // UUID (Foreign Key to Branch)
  ingredientId: string; // UUID (Foreign Key to Ingredient)
  currentQuantity: number; // DECIMAL(10,2) (Số lượng tồn kho hiện tại)
  unit?: string; // Denormalized from Ingredient for easier display
  lastStocktakeDate?: Date;
  notes?: string;
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại) - Thường là thời điểm bản ghi inventory được tạo lần đầu cho một cặp branch-ingredient.
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi current_quantity thay đổi)
}

export interface StockMovement {
  id: string; // UUID (Primary Key)
  branchId: string; // UUID (Foreign Key to Branch)
  ingredientId: string; // UUID (Foreign Key to Ingredient)
  userId?: string; // UUID (Foreign Key to User who performed/recorded movement, Optional)
  quantity: number; // DECIMAL(10,2) (Số lượng nhập hoặc xuất, âm nếu xuất)
  unit: string; // Denormalized from Ingredient
  type: 'purchase_in' | 'transfer_in' | 'production_out' | 'sale_out' | 'spoilage_out' | 'transfer_out' | 'stocktake_adjustment' | string; // TEXT
  source?: string; // TEXT (Nguồn gốc: nhà cung cấp, bán hàng...)
  referenceId?: string; // e.g., PurchaseOrder ID, Order ID, Transfer ID
  notes?: string;
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại) - Đây là thời điểm diễn ra sự kiện nhập/xuất kho.
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface CafeTable {
  id: string; // UUID (Primary Key)
  branchId: string; // UUID (Foreign Key to Branch)
  tableNumber: string; // TEXT (Số hiệu bàn, ví dụ: "B01")
  zone?: string; // TEXT (Khu vực: A, B, ngoài trời...)
  capacity?: number; // INTEGER (Optional)
  status: TableStatus; // Current operational status
  isActive: boolean; // BOOLEAN (Bàn đang hoạt động hay không, mặc định: true) - If the table definition is active
  currentOrderId?: string; // Optional: to link to an active order
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface Order {
  id: string; // UUID (Primary Key)
  tenantId: string; // UUID (Foreign Key to Tenant)
  branchId: string; // UUID (Foreign Key to Branch)
  userId: string; // UUID (Foreign Key to User - creator)
  tableId?: string; // UUID (Foreign Key to CafeTable - Optional)
  customerId?: string; // Optional FK to a CustomerLoyalty profile
  orderNumber?: string; // Human-readable order number
  status: 'pending' | 'open' | 'preparing' | 'ready' | 'served' | 'paid' | 'completed' | 'cancelled' | 'refunded' | string; // TEXT
  type: 'dine-in' | 'takeout' | 'delivery';
  subtotalAmount: number; // Sum of PersistedOrderItem totalPrices before discounts/taxes
  discountAmount?: number; // DECIMAL(10,2)
  taxAmount?: number;
  serviceChargeAmount?: number;
  totalAmount: number; // DECIMAL(10,2) (Tổng số tiền đơn hàng)
  paymentMethod?: string; // TEXT (cash, qr, transfer...)
  paymentTransactionId?: string; // ID from payment gateway
  notes?: string; // General notes for the order
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  paidAt?: Date; // TIMESTAMP (Optional - Thời điểm thanh toán)
  completedAt?: Date; // When order reached a final state (paid/completed/cancelled)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi, ví dụ khi trạng thái thay đổi hoặc thêm item)
}


export interface PersistedOrderItem {
  id: string; // UUID (Primary Key)
  orderId: string; // UUID (Foreign Key to Order)
  menuItemId: string; // UUID (Foreign Key to MenuItem)
  menuItemName?: string; // Denormalized for convenience
  quantity: number; // INTEGER (Số lượng món)
  unitPrice: number; // DECIMAL(10,2) (Giá của một đơn vị món tại thời điểm đặt hàng)
  itemSubtotal?: number; // quantity * unitPrice (can include option price adjustments in more complex scenarios)
  note?: string; // TEXT (Ghi chú cho món: ít đường, không đá..., Optional)
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi, ví dụ khi note hoặc quantity thay đổi)
}

// Client-side cart item structure - kept distinct
export interface OrderItem extends MenuItem {
  cartItemId: string; // Unique ID for the item in the cart
  quantity: number;
  notes?: string;
  selectedOptions?: Record<string, string>; // e.g. { "option_size": "choice_large", "option_milk": "choice_almond" }
  calculatedPrice: number; // MenuItem.price + sum of selected options' additionalPrice
}

export interface Payment {
  id: string; // UUID (Primary Key)
  orderId: string; // UUID (Foreign Key to Order)
  paymentMethod: string; // TEXT
  amount: number; // DECIMAL(10,2)
  transactionId?: string; // TEXT (Optional)
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface DiscountPromotion {
  id: string; // UUID (Primary Key)
  tenantId: string; // UUID (Foreign Key to Tenant)
  name: string; // TEXT
  type: 'percentage' | 'fixed_amount' | string; // TEXT
  value: number; // DECIMAL(10,2)
  minOrderValue?: number; // DECIMAL(10,2) (Optional)
  startDate: Date; // TIMESTAMP
  endDate: Date; // TIMESTAMP
  isActive: boolean; // BOOLEAN
  appliesTo?: 'all_orders' | 'specific_items' | 'specific_categories' | string; // TEXT
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface CustomerLoyalty {
  id: string; // UUID (Primary Key)
  tenantId: string; // UUID (Foreign Key to Tenant)
  name: string; // TEXT
  phoneNumber: string; // TEXT
  email?: string; // TEXT (Optional)
  totalPoints: number; // DECIMAL(10,2)
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}

export interface ShiftReport {
  id: string; // UUID (Primary Key)
  branchId: string; // UUID (Foreign Key to Branch)
  userId: string; // UUID (Foreign Key to User)
  startTime: Date; // TIMESTAMP
  endTime: Date; // TIMESTAMP
  totalCashIn: number; // DECIMAL(10,2)
  totalCardIn: number; // DECIMAL(10,2)
  totalQrIn: number; // DECIMAL(10,2)
  totalRevenue: number; // DECIMAL(10,2)
  totalTransactions: number; // INTEGER
  notes?: string; // TEXT (Optional)
  createdAt: Date; // TIMESTAMP (Mặc định: thời gian hiện tại)
  updatedAt: Date; // TIMESTAMP (Cập nhật tự động khi bản ghi thay đổi)
}


// Existing types for specific features - kept as they are not directly part of the core schema update
export interface HistoricalSale {
  date: string; // YYYY-MM-DD
  sales: number;
}

export interface PredictedSale {
  date: string; // YYYY-MM-DD
  predictedSales: number;
}

    