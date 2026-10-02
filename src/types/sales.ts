// Core Sales and Daily Closing Data Types & Contracts

export type ShoeCategory =
  | '拖鞋'
  | '雨鞋'
  | '包鞋'
  | '運動鞋'
  | '皮鞋'
  | '涼鞋'
  | '長短靴'
  | '其他';

export type PaymentMethod = 'cash' | 'credit' | 'mobile_pay';

export type SaleStatus = 'completed' | 'returned' | 'exchanged';

export interface SaleRecord {
  id: string;
  businessDate: string;          // YYYY-MM-DD
  timestamp: string;             // ISO string
  brand: string;
  sku: string;
  productName: string;
  color: string;
  sizeUS: number;
  sizeDisplay?: string;
  category: ShoeCategory;
  retailPrice: number;
  actualPaid: number;            // 實收金額
  paymentMethod: PaymentMethod;  // 'cash' | 'credit' | 'mobile_pay'
  status: SaleStatus;            // 'completed' | 'returned' | 'exchanged'
  isCustomItem: boolean;         // true if uncatalogued
  productId?: string;            // Linked Product ID if catalogued
  variantId?: string;            // Linked Variant ID if catalogued
  displayLocation?: string;      // Location at time of sale
  storageLocation?: string;      // Storage location
  notes?: string;
  operator?: string;
  returnReason?: string;
  returnTimestamp?: string;
  originalSaleId?: string;       // Linked exchange sale ID
  costPrice?: number;            // FIFO cost price at time of sale (快照進貨成本)
  grossProfit?: number;          // actualPaid - costPrice (快照毛利)
  batchId?: string;              // Linked InventoryBatch ID consumed
  stockInOrderId?: string;       // Linked StockInRecord orderId (e.g. "IN-20260908-001")
  reservationId?: string;        // Linked ReservationRecord ID if fulfilled from pre-order
}

export type SaleDraft = Omit<SaleRecord, 'id' | 'timestamp' | 'status'> & {
  status?: SaleStatus;
};

export interface BatchSaleDraftItem {
  id: string;
  brand: string;
  sku: string;
  name: string;
  color: string;
  sizeUS: number | string;
  sizeDisplay?: string;
  category: ShoeCategory;
  retailPrice: number | string;
  actualPaid: number | string;
  paymentMethod: PaymentMethod;
  notes?: string;
  matchedProductId?: string;
  matchedVariantId?: string;
  costPrice?: number;
  isCustom: boolean;
}

export interface PaymentSubtotal {
  amount: number;
  count: number;
  percentage: number;
}

export interface CategorySalesSummary {
  category: ShoeCategory;
  pairs: number;
  revenue: number;
  percentage: number;
}

export interface BrandSalesSummary {
  brand: string;
  pairs: number;
  revenue: number;
}

export interface DailyClosingSummary {
  businessDate: string;
  totalPairsSold: number;        // Gross completed
  totalPairsReturned: number;    // Returned
  netPairsSold: number;          // Completed - Returned
  grossRevenue: number;          // Sum actualPaid for completed
  returnedRevenue: number;       // Sum actualPaid for returned
  netRevenue: number;            // grossRevenue - returnedRevenue
  paymentBreakdown: {
    cash: PaymentSubtotal;
    credit: PaymentSubtotal;
    mobile_pay: PaymentSubtotal;
  };
  categoryDistribution: CategorySalesSummary[];
  brandLeaderboard: BrandSalesSummary[];
  records: SaleRecord[];
}

export const SHOE_CATEGORIES: ShoeCategory[] = [
  '運動鞋',
  '拖鞋',
  '涼鞋',
  '包鞋',
  '皮鞋',
  '雨鞋',
  '長短靴',
  '其他'
];

export const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'cash', label: '現金', icon: '💵' },
  { id: 'credit', label: '信用卡', icon: '💳' },
  { id: 'mobile_pay', label: '行動支付', icon: '📱' }
];

export const CATEGORY_COLORS: Record<ShoeCategory, { bg: string; text: string; border: string; activeBg: string }> = {
  運動鞋: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', activeBg: 'bg-blue-600' },
  拖鞋: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', activeBg: 'bg-amber-500' },
  涼鞋: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', activeBg: 'bg-emerald-600' },
  包鞋: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', activeBg: 'bg-violet-600' },
  皮鞋: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300', activeBg: 'bg-slate-700' },
  雨鞋: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', activeBg: 'bg-cyan-600' },
  長短靴: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', activeBg: 'bg-rose-600' },
  其他: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', activeBg: 'bg-purple-600' }
};
