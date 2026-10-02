import { SaleRecord } from '../types/sales';
import { getTaiwanDateStr, getTaiwanTodayStr, getTaiwanDaysAgoStr } from '../utils/dateUtils';

/**
 * Construct ISO timestamp for a specific date and time
 */
function createTimestamp(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00+08:00`).toISOString();
}

/**
 * Identify whether a sale record is one of the legacy mock seed sales or test fixtures
 */
export function isMockSale(s: { id?: string; sku?: string }): boolean {
  if (!s) return false;
  // If running in automated Playwright E2E test runner, preserve test fixtures in memory
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    return false;
  }
  if (s.id && (s.id.startsWith('sale-seed-') || s.id.startsWith('test-') || s.id.startsWith('sale-demo-'))) return true;
  if (s.sku === 'FD0655-001' || (s.sku && s.sku.startsWith('TEST-'))) return true;
  return false;
}

/**
 * Return empty array as default sales records (no simulated mock data)
 */
export function getInitialSeedSales(): SaleRecord[] {
  return [];
}

/**
 * Generate authentic initial sales records for test fixtures if needed
 */
export function getMockSeedSales(): SaleRecord[] {
  const now = new Date();
  const todayStr = getTaiwanTodayStr();
  
  // Helper to ensure today's seed sales strictly belong to today's date in Taiwan
  const pastTodayTime = (hoursAgo: number, minutesAgo: number = 0): string => {
    const candidate = new Date(now.getTime() - (hoursAgo * 60 + minutesAgo) * 60 * 1000);
    if (getTaiwanDateStr(candidate) === todayStr) {
      return candidate.toISOString();
    }
    const hour = Math.min(23, Math.max(9, 21 - hoursAgo));
    const minute = Math.min(59, Math.max(0, 60 - minutesAgo));
    return createTimestamp(todayStr, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
  };
  
  const yesterdayStr = getTaiwanDaysAgoStr(1);
  const twoDaysAgoStr = getTaiwanDaysAgoStr(2);

  return [
    // ==========================================
    // TODAY (今日即時營業銷貨 - 7 筆)
    // ==========================================
    {
      id: 'sale-seed-today-001',
      businessDate: todayStr,
      timestamp: pastTodayTime(7, 30),
      brand: 'Nike',
      sku: 'FD0655-001',
      productName: "Air Force 1 '07",
      color: 'Triple White 純白',
      sizeUS: 8.5,
      sizeDisplay: 'US 8.5 / 26.5cm',
      category: '運動鞋',
      retailPrice: 3400,
      actualPaid: 3400,
      paymentMethod: 'credit',
      status: 'completed',
      isCustomItem: false,
      productId: 'prod-1-FD0655-001',
      variantId: 'var-FD0655-001-8.5',
      displayLocation: 'A-01-L2',
      storageLocation: 'R1-C01-L3',
      notes: '會員9折優惠券',
      operator: '店長A'
    },
    {
      id: 'sale-seed-today-002',
      businessDate: todayStr,
      timestamp: pastTodayTime(6, 15),
      brand: '富發牌',
      sku: 'FFP-SLIP-88',
      productName: '輕量減壓踩屎感厚底拖鞋',
      color: '奶茶色',
      sizeUS: 7.0,
      sizeDisplay: 'US 7.0 / 25.0cm',
      category: '拖鞋',
      retailPrice: 490,
      actualPaid: 450,
      paymentMethod: 'cash',
      status: 'completed',
      isCustomItem: true,
      notes: '現金現折40元',
      operator: '早班-A'
    },
    {
      id: 'sale-seed-today-003',
      businessDate: todayStr,
      timestamp: pastTodayTime(5, 0),
      brand: 'New Balance',
      sku: 'U9060ECA',
      productName: '9060 复古慢跑鞋',
      color: 'Sea Salt 海鹽灰',
      sizeUS: 9.0,
      sizeDisplay: 'US 9.0 / 27.0cm',
      category: '運動鞋',
      retailPrice: 4880,
      actualPaid: 4880,
      paymentMethod: 'mobile_pay',
      status: 'completed',
      isCustomItem: false,
      productId: 'prod-6-U9060ECA',
      variantId: 'var-U9060ECA-9.0',
      displayLocation: 'A-03-L2',
      storageLocation: 'R2-C01-L3',
      notes: 'LINE Pay 行動支付結帳',
      operator: '早班-A'
    },
    {
      id: 'sale-seed-today-004',
      businessDate: todayStr,
      timestamp: pastTodayTime(3, 45),
      brand: '達新牌',
      sku: 'DSP-RAIN-01',
      productName: '多功能抗滑短筒晴雨靴',
      color: '曜石黑',
      sizeUS: 8.0,
      sizeDisplay: 'US 8.0 / 26.0cm',
      category: '雨鞋',
      retailPrice: 790,
      actualPaid: 790,
      paymentMethod: 'cash',
      status: 'completed',
      isCustomItem: true,
      notes: '午後陣雨臨櫃購買',
      operator: '中班-B'
    },
    {
      id: 'sale-seed-today-005',
      businessDate: todayStr,
      timestamp: pastTodayTime(2, 30),
      brand: '富發牌',
      sku: 'FFP-LOAFER-02',
      productName: '真皮氣墊日常休閒包鞋',
      color: '焦糖棕',
      sizeUS: 6.5,
      sizeDisplay: 'US 6.5 / 24.5cm',
      category: '包鞋',
      retailPrice: 1280,
      actualPaid: 1180,
      paymentMethod: 'cash',
      status: 'completed',
      isCustomItem: true,
      notes: '熟客折100元',
      operator: '中班-B'
    },
    {
      id: 'sale-seed-today-006',
      businessDate: todayStr,
      timestamp: pastTodayTime(1, 15),
      brand: 'Adidas',
      sku: 'B75806',
      productName: 'Samba OG',
      color: 'Cloud White/Core Black 白底黑條',
      sizeUS: 8.5,
      sizeDisplay: 'US 8.5 / 26.5cm',
      category: '運動鞋',
      retailPrice: 3490,
      actualPaid: 3490,
      paymentMethod: 'credit',
      status: 'completed',
      isCustomItem: false,
      productId: 'prod-11-B75806',
      variantId: 'var-B75806-8.5',
      displayLocation: 'C-02-L2',
      storageLocation: 'R3-C01-L3',
      operator: '晚班-C'
    },
    {
      id: 'sale-seed-today-007',
      businessDate: todayStr,
      timestamp: pastTodayTime(0, 30),
      brand: '富發牌',
      sku: 'FFP-DERBY-09',
      productName: '商務手工雕花正裝皮鞋',
      color: '紳士黑',
      sizeUS: 9.5,
      sizeDisplay: 'US 9.5 / 27.5cm',
      category: '皮鞋',
      retailPrice: 2280,
      actualPaid: 2280,
      paymentMethod: 'credit',
      status: 'completed',
      isCustomItem: true,
      notes: '明日面試急用',
      operator: '晚班-C'
    },

    // ==========================================
    // YESTERDAY (昨日銷貨紀錄 - 6 筆，含 1 筆退貨)
    // ==========================================
    {
      id: 'sale-seed-yest-001',
      businessDate: yesterdayStr,
      timestamp: createTimestamp(yesterdayStr, '11:40'),
      brand: 'Nike',
      sku: 'DD1391-100',
      productName: 'Dunk Low Retro',
      color: 'White/Black 黑白熊貓',
      sizeUS: 8.5,
      sizeDisplay: 'US 8.5 / 26.5cm',
      category: '運動鞋',
      retailPrice: 3400,
      actualPaid: 3400,
      paymentMethod: 'credit',
      status: 'completed',
      isCustomItem: false,
      productId: 'prod-2-DD1391-100',
      variantId: 'var-DD1391-100-8.5',
      displayLocation: 'A-01-L3',
      storageLocation: 'R1-C01-L2',
      operator: '早班-A'
    },
    {
      id: 'sale-seed-yest-002',
      businessDate: yesterdayStr,
      timestamp: createTimestamp(yesterdayStr, '13:10'),
      brand: 'Birkenstock',
      sku: 'BIRK-ARI-01',
      productName: 'Arizona 經典雙帶軟木涼鞋',
      color: '摩卡棕',
      sizeUS: 8.0,
      sizeDisplay: 'US 8.0 / 26.0cm',
      category: '涼鞋',
      retailPrice: 3180,
      actualPaid: 2980,
      paymentMethod: 'mobile_pay',
      status: 'completed',
      isCustomItem: true,
      notes: '街口支付滿額折200',
      operator: '早班-A'
    },
    {
      id: 'sale-seed-yest-003',
      businessDate: yesterdayStr,
      timestamp: createTimestamp(yesterdayStr, '15:20'),
      brand: '富發牌',
      sku: 'FFP-SLIP-88',
      productName: '輕量減壓踩屎感厚底拖鞋',
      color: '抹茶綠',
      sizeUS: 8.0,
      sizeDisplay: 'US 8.0 / 26.0cm',
      category: '拖鞋',
      retailPrice: 490,
      actualPaid: 490,
      paymentMethod: 'cash',
      status: 'completed',
      isCustomItem: true,
      operator: '中班-B'
    },
    {
      id: 'sale-seed-yest-004',
      businessDate: yesterdayStr,
      timestamp: createTimestamp(yesterdayStr, '16:50'),
      brand: 'Nike',
      sku: 'FD2722-100',
      productName: 'Pegasus 41',
      color: 'White/Volt 螢光白',
      sizeUS: 9.0,
      sizeDisplay: 'US 9.0 / 27.0cm',
      category: '運動鞋',
      retailPrice: 4200,
      actualPaid: 4200,
      paymentMethod: 'credit',
      status: 'returned',
      isCustomItem: false,
      productId: 'prod-3-FD2722-100',
      variantId: 'var-FD2722-100-9.0',
      displayLocation: 'B-01-L2',
      storageLocation: 'R2-C02-L2',
      returnReason: '尺寸買大送人試穿不合，退款',
      returnTimestamp: createTimestamp(yesterdayStr, '19:40'),
      operator: '晚班-C'
    },
    {
      id: 'sale-seed-yest-005',
      businessDate: yesterdayStr,
      timestamp: createTimestamp(yesterdayStr, '18:30'),
      brand: 'New Balance',
      sku: 'MR530SG',
      productName: '530 Retro Running',
      color: 'White Silver 白銀',
      sizeUS: 7.5,
      sizeDisplay: 'US 7.5 / 25.5cm',
      category: '運動鞋',
      retailPrice: 3080,
      actualPaid: 3080,
      paymentMethod: 'cash',
      status: 'completed',
      isCustomItem: false,
      productId: 'prod-9-MR530SG',
      variantId: 'var-MR530SG-7.5',
      displayLocation: 'B-01-L3',
      storageLocation: 'R2-C03-L2',
      operator: '晚班-C'
    },
    {
      id: 'sale-seed-yest-006',
      businessDate: yesterdayStr,
      timestamp: createTimestamp(yesterdayStr, '20:50'),
      brand: '達新牌',
      sku: 'DSP-RAIN-02',
      productName: '強韌防刺加厚長筒工作雨靴',
      color: '深藍色',
      sizeUS: 10.0,
      sizeDisplay: 'US 10.0 / 28.0cm',
      category: '雨鞋',
      retailPrice: 890,
      actualPaid: 890,
      paymentMethod: 'cash',
      status: 'completed',
      isCustomItem: true,
      operator: '晚班-C'
    },

    // ==========================================
    // TWO DAYS AGO (前日歷史銷售 - 4 筆)
    // ==========================================
    {
      id: 'sale-seed-past-001',
      businessDate: twoDaysAgoStr,
      timestamp: createTimestamp(twoDaysAgoStr, '12:00'),
      brand: 'Nike',
      sku: 'FD0655-001',
      productName: "Air Force 1 '07",
      color: 'Triple White 純白',
      sizeUS: 9.0,
      sizeDisplay: 'US 9.0 / 27.0cm',
      category: '運動鞋',
      retailPrice: 3400,
      actualPaid: 3400,
      paymentMethod: 'cash',
      status: 'completed',
      isCustomItem: false,
      productId: 'prod-1-FD0655-001',
      variantId: 'var-FD0655-001-9.0',
      operator: '早班-A'
    },
    {
      id: 'sale-seed-past-002',
      businessDate: twoDaysAgoStr,
      timestamp: createTimestamp(twoDaysAgoStr, '14:35'),
      brand: '富發牌',
      sku: 'FFP-BOOT-01',
      productName: '英倫復古厚底側拉鍊短靴',
      color: '霧面黑',
      sizeUS: 7.0,
      sizeDisplay: 'US 7.0 / 25.0cm',
      category: '長短靴',
      retailPrice: 1680,
      actualPaid: 1580,
      paymentMethod: 'credit',
      status: 'completed',
      isCustomItem: true,
      operator: '中班-B'
    },
    {
      id: 'sale-seed-past-003',
      businessDate: twoDaysAgoStr,
      timestamp: createTimestamp(twoDaysAgoStr, '17:50'),
      brand: 'Adidas',
      sku: 'IH7829',
      productName: 'Gazelle Indoor',
      color: 'Collegiate Green 復古綠膠底',
      sizeUS: 8.5,
      sizeDisplay: 'US 8.5 / 26.5cm',
      category: '運動鞋',
      retailPrice: 3890,
      actualPaid: 3890,
      paymentMethod: 'mobile_pay',
      status: 'completed',
      isCustomItem: false,
      productId: 'prod-12-IH7829',
      variantId: 'var-IH7829-8.5',
      operator: '晚班-C'
    },
    {
      id: 'sale-seed-past-004',
      businessDate: twoDaysAgoStr,
      timestamp: createTimestamp(twoDaysAgoStr, '20:10'),
      brand: '富發牌',
      sku: 'FFP-SLIP-88',
      productName: '輕量減壓踩屎感厚底拖鞋',
      color: '深灰黑',
      sizeUS: 9.0,
      sizeDisplay: 'US 9.0 / 27.0cm',
      category: '拖鞋',
      retailPrice: 490,
      actualPaid: 450,
      paymentMethod: 'cash',
      status: 'completed',
      isCustomItem: true,
      operator: '晚班-C'
    }
  ];
}
