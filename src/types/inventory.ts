// Core Inventory Data Models

export type SizeUnit = 'US' | 'EU' | 'CM' | 'ALPHA';

export type SizeSegment = 'all' | 'men' | 'women' | 'youth' | 'kids';

export type StockLevel = 'out' | 'warning' | 'sufficient';

export type ProcurementType = '買斷' | '寄賣';

export interface Product {
  id: string;
  sku: string;           // e.g. "CW2288-111"
  brand: string;         // e.g. "Nike"
  name: string;          // e.g. "Air Force 1 '07"
  color: string;         // e.g. "White"
  category: string;      // "Lifestyle" | "Running" | "Basketball" | "Skateboarding" | "Outdoor"
  retailPrice: number;
  costPrice: number;
  barcode: string;       // EAN-13
  displayLocation: string; // e.g. "A-01-L2"
  storageLocation: string; // e.g. "R1-C03-L2"
  procurementType?: ProcurementType; // '買斷' | '寄賣' (預設 '買斷')
  sizeUnit?: SizeUnit;               // e.g. 'US' | 'EU' | 'CM' | 'ALPHA'
  minSize?: string;                  // e.g. "37" or "8.0"
  maxSize?: string;                  // e.g. "41" or "10.0"
  isHalfStep?: boolean;              // 是否為每半號 (0.5) 間隔；false 為每整號 (1.0) 間隔
}

export interface InventoryBatch {
  id: string;               // e.g. "batch-1725782400000-abcd"
  stockInId?: string;       // Linked StockInRecord ID
  stockInOrderId?: string;  // Linked StockInRecord orderId (e.g. "IN-20260908-001")
  timestamp: string;        // ISO 8601 string for FIFO sorting
  costPrice: number;        // Unit cost price at purchase
  initialStock: number;     // Original stock-in quantity
  remainingStock: number;   // Remaining available stock in this batch
}

export interface ShoeVariant {
  id: string;
  productId: string;
  sizeUS: number;        // 6.0 ~ 12.0 or approximate numeric
  sizeEU: number;        // 38.5 ~ 46.0
  sizeCM: number;        // 24.0 ~ 30.0
  stock: number;         // >= 0
  sizeDisplay?: string;  // e.g. "6C", "1Y", "M", "US 8.5"
  batches?: InventoryBatch[]; // FIFO batch queue sorted ascending by timestamp
}

export interface ProductWithVariants extends Product {
  variants: ShoeVariant[];
}

export interface SelectedShoeTarget {
  productId: string;
  variantId?: string;
  displayLocation: string;
  storageLocation: string;
}

export interface InventoryDeductPayload {
  variantId: string;
  productId: string;
  quantity: number;      // default 1
  sourceDevice: string;  // "mobile-clerk" | "desktop-counter"
  timestamp: string;
}

export interface RealtimeSyncEvent {
  type: "STOCK_DEDUCTED" | "STOCK_UPDATED" | "INVENTORY_RESET";
  payload: {
    variantId: string;
    newStock: number;
    productId: string;
    timestamp: string;
  };
}

export interface InventoryLog {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  sizeUS: number;
  delta: number;
  stockBefore: number;
  stockAfter: number;
  action: 'sale_deduct' | 'restock' | 'excel_import' | 'manual_adjust' | 'sale_return_rollback';
  operator: string;
  timestamp: string;
}

/**
 * Determine stock level category:
 * 0: out (Red)
 * 1~2: warning (Yellow)
 * 3+: sufficient (Green)
 */
export function getStockLevel(stock: number): StockLevel {
  if (stock <= 0) return 'out';
  if (stock <= 2) return 'warning';
  return 'sufficient';
}
