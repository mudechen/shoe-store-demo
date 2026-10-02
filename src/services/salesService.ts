import * as XLSX from 'xlsx';
import { ProductWithVariants } from '../types/inventory';
import {
  SaleRecord,
  DailyClosingSummary,
  ShoeCategory,
  SHOE_CATEGORIES
} from '../types/sales';
import { getTaiwanDateTimeStr, getTaiwanTimeStr } from '../utils/dateUtils';
import { formatSaleSizeDisplay } from '../data/sizeStandards';

/**
 * Filter sales records strictly by business date (YYYY-MM-DD)
 */
export function filterSalesByDate(sales: SaleRecord[], targetDate: string): SaleRecord[] {
  if (!targetDate) return [];
  return sales
    .filter((s) => s.businessDate === targetDate)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Calculate comprehensive Daily Closing Summary & Reconciliation Metrics
 */
export function calculateDailyClosing(sales: SaleRecord[], targetDate: string): DailyClosingSummary {
  const dayRecords = filterSalesByDate(sales, targetDate);

  const allSales = dayRecords.filter((s) => s.status === 'completed' || s.status === 'returned');
  const completed = dayRecords.filter((s) => s.status === 'completed');
  const returned = dayRecords.filter((s) => s.status === 'returned');

  const totalPairsSold = allSales.length;
  const totalPairsReturned = returned.length;
  const netPairsSold = Math.max(0, totalPairsSold - totalPairsReturned);

  const grossRevenue = allSales.reduce((sum, r) => sum + (Number(r.actualPaid) || 0), 0);
  const returnedRevenue = returned.reduce((sum, r) => sum + (Number(r.actualPaid) || 0), 0);
  const netRevenue = grossRevenue - returnedRevenue;

  // Payment Breakdown (Calculated from completed sales for exact register reconciliation)
  const cashRecords = completed.filter((r) => r.paymentMethod === 'cash');
  const creditRecords = completed.filter((r) => r.paymentMethod === 'credit');
  const mobileRecords = completed.filter((r) => r.paymentMethod === 'mobile_pay' || (r.paymentMethod as string) === 'mobile');

  const cashAmount = cashRecords.reduce((sum, r) => sum + (Number(r.actualPaid) || 0), 0);
  const creditAmount = creditRecords.reduce((sum, r) => sum + (Number(r.actualPaid) || 0), 0);
  const mobileAmount = mobileRecords.reduce((sum, r) => sum + (Number(r.actualPaid) || 0), 0);

  const paymentBreakdown = {
    cash: {
      amount: cashAmount,
      count: cashRecords.length,
      percentage: netRevenue > 0 ? Math.round((cashAmount / netRevenue) * 1000) / 10 : 0
    },
    credit: {
      amount: creditAmount,
      count: creditRecords.length,
      percentage: netRevenue > 0 ? Math.round((creditAmount / netRevenue) * 1000) / 10 : 0
    },
    mobile_pay: {
      amount: mobileAmount,
      count: mobileRecords.length,
      percentage: netRevenue > 0 ? Math.round((mobileAmount / netRevenue) * 1000) / 10 : 0
    }
  };

  // Category Distribution
  const categoryMap = new Map<ShoeCategory, { pairs: number; revenue: number }>();
  for (const cat of SHOE_CATEGORIES) {
    categoryMap.set(cat, { pairs: 0, revenue: 0 });
  }

  for (const record of completed) {
    const existing = categoryMap.get(record.category) || { pairs: 0, revenue: 0 };
    existing.pairs += 1;
    existing.revenue += Number(record.actualPaid) || 0;
    categoryMap.set(record.category, existing);
  }

  const categoryDistribution = Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      pairs: stats.pairs,
      revenue: stats.revenue,
      percentage: totalPairsSold > 0 ? Math.round((stats.pairs / totalPairsSold) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.pairs - a.pairs || b.revenue - a.revenue);

  // Brand Leaderboard
  const brandMap = new Map<string, { pairs: number; revenue: number }>();
  for (const record of completed) {
    const brand = record.brand ? record.brand.trim() : '其他品牌';
    const existing = brandMap.get(brand) || { pairs: 0, revenue: 0 };
    existing.pairs += 1;
    existing.revenue += Number(record.actualPaid) || 0;
    brandMap.set(brand, existing);
  }

  const brandLeaderboard = Array.from(brandMap.entries())
    .map(([brand, stats]) => ({
      brand,
      pairs: stats.pairs,
      revenue: stats.revenue
    }))
    .sort((a, b) => b.pairs - a.pairs || b.revenue - a.revenue);

  return {
    businessDate: targetDate,
    totalPairsSold,
    totalPairsReturned,
    netPairsSold,
    grossRevenue,
    returnedRevenue,
    netRevenue,
    paymentBreakdown,
    categoryDistribution,
    brandLeaderboard,
    records: dayRecords
  };
}

/**
 * Intelligent Shoe Matcher: Barcode exact -> SKU exact -> SKU contains -> Name contains -> Brand contains
 */
export function findMatchingShoe(
  products: ProductWithVariants[],
  query: string
): ProductWithVariants | undefined {
  if (!query || typeof query !== 'string') return undefined;
  const q = query.trim();
  if (!q) return undefined;
  const upperQuery = q.toUpperCase();
  const digitsOnly = q.replace(/\D/g, '');

  // 1. Exact Barcode Match
  if (digitsOnly.length >= 8) {
    const matchedBarcode = products.find((p) => {
      const pDigits = p.barcode.replace(/\D/g, '');
      if (pDigits === digitsOnly) return true;
      if (pDigits.length === 12 && digitsOnly === '0' + pDigits) return true;
      if (digitsOnly.length === 12 && pDigits === '0' + digitsOnly) return true;
      return false;
    });
    if (matchedBarcode) return matchedBarcode;
  }

  // 2. Exact SKU Match
  const matchedSku = products.find((p) => p.sku.toUpperCase() === upperQuery);
  if (matchedSku) return matchedSku;

  // 3. Partial SKU Match
  const partialSku = products.find((p) => p.sku.toUpperCase().includes(upperQuery));
  if (partialSku) return partialSku;

  // 4. Product Name Match
  const matchedName = products.find((p) => p.name.toUpperCase().includes(upperQuery));
  if (matchedName) return matchedName;

  // 5. Brand Match
  const matchedBrand = products.find((p) => p.brand.toUpperCase().includes(upperQuery));
  if (matchedBrand) return matchedBrand;

  return undefined;
}

/**
 * Helper to sanitize potential CSV/Excel formula injection
 */
function sanitizeCell(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (/^[=+@-]$/.test(str[0])) {
    return `'${str}`;
  }
  return str;
}

/**
 * Export Daily Closing Summary to a 2-Sheet Excel Workbook (.xlsx)
 * Sheet 1: 日結彙總對帳表 (Summary & KPIs)
 * Sheet 2: 銷貨流水帳明細 (Transaction Ledger)
 */
export function exportDailyClosingToExcel(summary: DailyClosingSummary, filename?: string): void {
  const wb = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: 日結彙總對帳表
  // -------------------------------------------------------------
  const summaryAoa: (string | number)[][] = [
    ['=== 實體鞋店 每日營業銷貨日結對帳報表 ==='],
    ['營業日期', summary.businessDate],
    ['產表時間', getTaiwanDateTimeStr(new Date(), true)],
    [],
    ['【核心營收對帳】', ''],
    ['銷售總雙數 (毛)', summary.totalPairsSold, '件/雙'],
    ['退貨總雙數', summary.totalPairsReturned, '件/雙'],
    ['淨銷售雙數', summary.netPairsSold, '件/雙'],
    ['總營業額 (毛額)', summary.grossRevenue, 'TWD'],
    ['退貨退款金額', summary.returnedRevenue, 'TWD'],
    ['淨營業總額', summary.netRevenue, 'TWD'],
    [],
    ['【支付管道金流對帳 (收銀結帳明細)】'],
    ['支付方式', '實收總額 (TWD)', '結帳筆數', '營收佔比'],
    [
      '現金 (Cash)',
      summary.paymentBreakdown.cash.amount,
      summary.paymentBreakdown.cash.count,
      `${summary.paymentBreakdown.cash.percentage}%`
    ],
    [
      '信用卡 (Credit Card)',
      summary.paymentBreakdown.credit.amount,
      summary.paymentBreakdown.credit.count,
      `${summary.paymentBreakdown.credit.percentage}%`
    ],
    [
      '行動支付 (Mobile Pay)',
      summary.paymentBreakdown.mobile_pay.amount,
      summary.paymentBreakdown.mobile_pay.count,
      `${summary.paymentBreakdown.mobile_pay.percentage}%`
    ],
    ['合計', summary.grossRevenue, summary.totalPairsSold, '100%'],
    [],
    ['【鞋款分類銷售分佈】'],
    ['分類名稱', '銷售雙數', '銷售金額 (TWD)', '雙數佔比']
  ];

  for (const cat of summary.categoryDistribution) {
    if (cat.pairs > 0 || cat.revenue > 0) {
      summaryAoa.push([cat.category, cat.pairs, cat.revenue, `${cat.percentage}%`]);
    }
  }

  summaryAoa.push([], ['【廠家/品牌熱銷排行】'], ['品牌 / 廠家', '銷售雙數', '銷售金額 (TWD)']);

  for (const brand of summary.brandLeaderboard) {
    summaryAoa.push([sanitizeCell(brand.brand), brand.pairs, brand.revenue]);
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, '日結彙總對帳');

  // -------------------------------------------------------------
  // Sheet 2: 銷貨流水帳明細
  // -------------------------------------------------------------
  const ledgerHeaders = [
    '序號',
    '銷售時間',
    '交易狀態',
    '廠家/品牌',
    '款號 / SKU',
    '品名',
    '顏色',
    '尺寸 (US)',
    '尺碼標示',
    '鞋款分類',
    '建議售價',
    '實收金額',
    '支付方式',
    '庫存狀態',
    '展示架位',
    '後倉架位',
    '門市人員',
    '退貨時間',
    '退貨原因',
    '備註'
  ];

  const ledgerAoa: (string | number)[][] = [ledgerHeaders];

  summary.records.forEach((r, idx) => {
    const timeStr = r.timestamp ? getTaiwanTimeStr(r.timestamp, true) : '';
    const statusMap: Record<string, string> = {
      completed: '已完成',
      returned: '已退貨',
      exchanged: '已換貨'
    };
    const paymentMap: Record<string, string> = {
      cash: '現金',
      credit: '信用卡',
      mobile_pay: '行動支付',
      mobile: '行動支付'
    };

    ledgerAoa.push([
      idx + 1,
      timeStr,
      statusMap[r.status] || r.status,
      sanitizeCell(r.brand),
      sanitizeCell(r.sku),
      sanitizeCell(r.productName),
      sanitizeCell(r.color),
      r.sizeUS,
      formatSaleSizeDisplay(r.sizeDisplay, r.sizeUS),
      r.category,
      r.retailPrice,
      r.actualPaid,
      paymentMap[r.paymentMethod] || r.paymentMethod,
      r.isCustomItem ? '未建檔商品 (純記帳)' : '庫存連動扣減',
      r.displayLocation || '-',
      r.storageLocation || '-',
      sanitizeCell(r.operator || '門市人員'),
      r.returnTimestamp ? getTaiwanTimeStr(r.returnTimestamp, true) : '-',
      sanitizeCell(r.returnReason || '-'),
      sanitizeCell(r.notes || '')
    ]);
  });

  const wsLedger = XLSX.utils.aoa_to_sheet(ledgerAoa);
  wsLedger['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 24 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLedger, '銷貨流水帳明細');

  const safeFilename = filename || `銷貨日結報表_${summary.businessDate}.xlsx`;
  XLSX.writeFile(wb, safeFilename);
}

/**
 * Export Daily Closing Transaction Ledger to standard UTF-8 CSV with BOM
 */
export function exportDailyClosingToCSV(summary: DailyClosingSummary, filename?: string): void {
  const headers = [
    '序號',
    '銷售時間',
    '交易狀態',
    '廠家/品牌',
    '款號/SKU',
    '品名',
    '顏色',
    '尺寸',
    '鞋款分類',
    '定價',
    '實收金額',
    '支付方式',
    '庫存狀態',
    '備註'
  ];

  const rows: string[][] = [headers];

  const statusMap: Record<string, string> = {
    completed: '已完成',
    returned: '已退貨',
    exchanged: '已換貨'
  };
  const paymentMap: Record<string, string> = {
    cash: '現金',
    credit: '信用卡',
    mobile_pay: '行動支付',
    mobile: '行動支付'
  };

  summary.records.forEach((r, idx) => {
    const timeStr = r.timestamp ? getTaiwanTimeStr(r.timestamp, true) : '';
    rows.push([
      String(idx + 1),
      timeStr,
      statusMap[r.status] || r.status,
      sanitizeCell(r.brand),
      sanitizeCell(r.sku),
      sanitizeCell(r.productName),
      sanitizeCell(r.color),
      formatSaleSizeDisplay(r.sizeDisplay, r.sizeUS),
      r.category,
      String(r.retailPrice),
      String(r.actualPaid),
      paymentMap[r.paymentMethod] || r.paymentMethod,
      r.isCustomItem ? '未建檔' : '已扣庫',
      sanitizeCell(r.notes || '')
    ]);
  });

  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\r\n');

  // Prepend UTF-8 BOM so Excel in Traditional Chinese renders properly
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const safeFilename = filename || `營業日結銷貨明細_${summary.businessDate}.csv`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
