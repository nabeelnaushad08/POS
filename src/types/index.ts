export type Role = "ADMIN" | "MANAGER" | "CASHIER";
export type PaymentMethod = "CASH" | "CARD" | "MIXED";
export type SaleStatus = "COMPLETED" | "REFUNDED" | "VOIDED";
export type PurchaseStatus = "PENDING" | "RECEIVED" | "PARTIAL" | "CANCELLED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  isActive: boolean;
  createdAt: string | Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  _count?: { products: number };
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string | Date;
  _count?: { sales: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  costPrice: number | string;
  sellingPrice: number | string;
  stock: number;
  minimumStock: number;
  unit: string;
  image?: string | null;
  isActive: boolean;
  createdAt: string | Date;
  supplierProducts?: { supplierId: string; supplier: { id: string; name: string } }[];
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: string | Date;
  products?: { product: Product }[];
  _count?: { products: number; purchases: number };
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  purchaseId?: string | null;
  amount: number | string;
  method: PaymentMethod;
  notes?: string | null;
  createdAt: string | Date;
  purchase?: { purchaseNumber: string } | null;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number | string;
  subtotal: number | string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  userId: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  amountPaid: number | string;
  status: PurchaseStatus;
  notes?: string | null;
  createdAt: string | Date;
  supplier?: { id: string; name: string; phone?: string | null; address?: string | null };
  user?: { name: string };
  items?: PurchaseItem[];
  payments?: SupplierPayment[];
}

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  quantity: number;
  stock: number;
  image?: string | null;
  unit: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  costPrice: number | string;
  unitPrice: number | string;
  subtotal: number | string;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  userId: string;
  customerId?: string | null;
  user?: { name: string; email: string };
  customer?: Customer | null;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  paymentMethod: PaymentMethod;
  cashAmount?: number | string | null;
  cardAmount?: number | string | null;
  change?: number | string | null;
  status: SaleStatus;
  notes?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items?: SaleItem[];
  createdAt: string | Date;
}

export interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  minimumStock: number;
}

export interface DashboardStats {
  todayRevenue: number;
  todayTransactions: number;
  weekRevenue: number;
  monthRevenue: number;
  totalProducts: number;
  lowStockCount: number;
  lowStockProducts: LowStockProduct[];
  topProducts: Array<{
    id: string;
    name: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  recentSales: Sale[];
  salesChart: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

export interface PrinterSettings {
  id: string;
  type: string;
  printerName?: string | null;
  paperSize: string;
  headerTitle?: string | null;
  logo?: string | null;
  showLogo: boolean;
  footer?: string | null;
  showFooter: boolean;
  copies: number;
}

export interface SystemSettings {
  id: string;
  systemName: string;
  logo?: string | null;
  currency: string;
  currencySymbol: string;
  timezone: string;
  taxRate: number | string;
  theme: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
