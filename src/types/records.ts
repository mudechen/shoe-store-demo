// Core Records Data Models & Types (Milestone 1-R3)
import { ProcurementType } from './inventory';

export type CustomerReturnReason = '尺寸不合' | '瑕疵' | '其他';

export type VendorReturnReason = '瑕疵' | '過季' | '滯銷' | '其他';

export type DateFilterType = 'today' | 'yesterday' | '7days' | '30days' | 'custom' | 'all';

export interface StockInItemDetail {
  sizeKey: string;
  sizeUS: number;
  quantity: number;
}

export interface StockInRecord {
  id: string;                    // e.g. "stockin-1725782400000-abcd"
  orderId: string;               // e.g. "IN-20260908-001"
  date: string;                  // ISO 8601 string or YYYY-MM-DD
  vendor: string;                // Manufacturer / Brand
  sku: string;                   // Shoe SKU / model number
  productName: string;           // Shoe Name
  color: string;                 // Colorway description
  sizeBreakdown: Record<string, number>; // e.g. { "US 8.0": 3, "US 8.5": 5 }
  totalPairs: number;            // Total pairs in batch
  costPerPair: number;           // Purchase unit cost
  totalCost: number;             // totalPairs * costPerPair
  operator: string;              // Clerk / handler name
  notes?: string;                // Remarks

  // Extended optional fields for system-wide compatibility
  batchNo?: string;              // Alias for orderId
  timestamp?: string;            // ISO timestamp
  category?: string;             // Shoe category
  retailPrice?: number;          // Suggested retail price
  productId?: string;            // Linked Product ID
  procurementType?: ProcurementType; // '買斷' | '寄賣'
  sizeDetails?: StockInItemDetail[]; // Detailed size breakdown array

  // Versioned Stock-In Record fields
  revisionOf?: string;           // 指向被修訂的原始單據 ID
  revisionNo?: number;           // 修訂版本號（0 為原單，1, 2... 為修訂版）
  isSuperseded?: boolean;        // 是否已被取代（true 表示歷史存檔，不計入加總）
  originalCostPerPair?: number;  // 修訂前單雙成本
  originalTotalCost?: number;    // 修訂前總成本
  costModifiedAt?: string;       // 修改時間戳
  costModifiedReason?: string;   // 修改原因備註
}

export interface VendorReturnRecord {
  id: string;                    // e.g. "vret-1725782400000-wxyz"
  orderId: string;               // e.g. "VR-20260908-001"
  date: string;                  // ISO 8601 string or YYYY-MM-DD
  vendor: string;                // Target vendor
  sku: string;                   // Shoe model SKU
  productName: string;           // Shoe name
  size: string;                  // e.g. "US 9.0"
  quantity: number;              // Returned pairs (must be <= stock)
  reason: VendorReturnReason;    // Categorized reason
  reasonDetail?: string;         // Additional description
  refundAmount: number;          // Expected refund / credit amount
  operator: string;              // Clerk / handler name
  status: 'completed';           // Status

  // Extended optional fields for system-wide compatibility
  returnNo?: string;             // Alias for orderId
  timestamp?: string;            // ISO timestamp
  color?: string;                // Colorway description
  sizeUS?: number;               // Numeric size
  sizeDisplay?: string;          // Formatted size string
  productId?: string;            // Linked Product ID
  variantId?: string;            // Linked ShoeVariant ID
  notes?: string;                // Remarks
  creditAmount?: number;         // Alias for refundAmount
  costPrice?: number;            // Unit cost price at return
  sizeBreakdown?: Record<string, number>; // Size breakdown mapping (e.g. { "US 8.0": 1, "US 8.5": 2 })
  totalPairs?: number;           // Total returned pairs in batch
}

export const CUSTOMER_RETURN_REASONS: CustomerReturnReason[] = ['尺寸不合', '瑕疵', '其他'];

export const VENDOR_RETURN_REASONS: VendorReturnReason[] = ['瑕疵', '過季', '滯銷', '其他'];

/**
 * Filter out mock or demo stock-in records outside of test runner
 */
export function isMockStockIn(r: { id?: string; sku?: string }): boolean {
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    return false;
  }
  if (!r) return false;
  if (r.id && (r.id.startsWith('stk-demo-') || r.id.startsWith('test-') || r.id.startsWith('stockin-demo-'))) return true;
  if (r.sku === 'FD0655-001' || (r.sku && r.sku.startsWith('TEST-'))) return true;
  return false;
}

/**
 * Filter out mock or demo vendor return records outside of test runner
 */
export function isMockVendorReturn(r: { id?: string; sku?: string }): boolean {
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    return false;
  }
  if (!r) return false;
  if (r.id && (r.id.startsWith('ret-demo-') || r.id.startsWith('test-') || r.id.startsWith('vret-demo-'))) return true;
  if (r.sku === 'FD0655-001' || (r.sku && r.sku.startsWith('TEST-'))) return true;
  return false;
}

