import { ShoeCategory } from './sales';

export type ReservationStatus = 
  | 'pending_arrival'   // 待到貨 (缺貨等待補貨入庫)
  | 'arrived_ready'      // 已到貨/待取貨 (門市已進貨，通知客戶來店取鞋)
  | 'completed'          // 已取貨結清 (已付清尾款並轉為銷貨扣除庫存)
  | 'cancelled';         // 已取消/已退訂

export interface ReservationRecord {
  id: string;
  businessDate: string;        // 預訂日期 (YYYY-MM-DD)
  customerName: string;        // 客戶姓名
  customerPhone: string;       // 聯絡電話
  brand: string;               // 品牌 (Nike, New Balance, etc.)
  sku: string;                 // 貨號
  productName: string;         // 品名
  color: string;               // 顏色
  sizeUS: number | null;       // 美規尺碼
  sizeDisplay: string;         // 尺碼顯示標籤
  category: ShoeCategory;      // 分類
  retailPrice: number;         // 預定總價
  depositPaid: number;         // 已收定金
  remainingBalance: number;    // 應收尾款 (retailPrice - depositPaid)
  depositPaymentMethod: string;// 定金支付方式 (cash, credit_card, line_pay, bank_transfer)
  finalPaymentMethod?: string; // 尾款支付方式
  status: ReservationStatus;   // 當前狀態
  notes?: string;              // 備註
  createdAt: number;           // 建立時間戳記
  arrivedAt?: number;          // 到貨時間戳記
  fulfilledAt?: number;        // 取貨時間戳記
  saleId?: string;             // 關聯銷貨單 ID
  productId?: string;          // 關聯商品 ID
  variantId?: string;          // 關聯規格 ID
}
