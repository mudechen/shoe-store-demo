import { ProductWithVariants } from '../types/inventory';
import { SaleRecord } from '../types/sales';
import { getTaiwanTodayStr } from '../utils/dateUtils';
import { calculateProductInventoryCost } from './fifoService';

export interface RetailAnalyticsSummary {
  // KPI Overview
  todayRevenue: number;
  todayCost: number;
  todayGrossProfit: number;
  todayGrossMarginPct: number; // e.g. 42.5%
  todayPairsSold: number;
  avgOrderValue: number; // 客單價

  // Inventory Health & Turnover
  totalInventoryPairs: number;
  totalInventoryValuation: number; // 庫存總貨值 (以零售價計)
  totalInventoryCostValuation: number; // 庫存總成本值
  inventoryTurnoverRate: number; // 年化週轉率
  daysOfInventoryOnHand: number; // 庫存週轉天數 (DOH)

  // Critical Retail Action Alerts
  brokenGoldenSizeAlerts: {
    product: ProductWithVariants;
    outGoldenSizes: number[]; // 斷掉的黃金尺碼
    totalRemainingPairs: number;
  }[];

  slowMovingAlerts: {
    product: ProductWithVariants;
    stock: number;
    daysInactive: number;
    costTrapped: number;
  }[];

  // Category & Vendor Breakdown
  categoryPerformance: {
    category: string;
    pairs: number;
    revenue: number;
    grossProfit: number;
    marginPct: number;
    sharePct: number;
  }[];

  vendorPerformance: {
    vendor: string;
    pairs: number;
    revenue: number;
    grossProfit: number;
    sharePct: number;
  }[];

  // Cashier Breakdown for Reconciliation
  paymentBreakdown: {
    cash: number;
    credit: number;
    mobile_pay: number;
  };
}

/**
 * Common Golden Sizes in Shoe Retail:
 * Men's US 8.0 ~ 10.0
 */
const GOLDEN_SIZES_US = [7.5, 8.0, 8.5, 9.0, 9.5, 10.0];

export function calculateRetailAnalytics(
  products: ProductWithVariants[],
  sales: SaleRecord[],
  targetDate: string = getTaiwanTodayStr()
): RetailAnalyticsSummary {
  // 1. Filter today's completed sales
  const todaySales = sales.filter(
    (s) => s.businessDate === targetDate && s.status === 'completed'
  );

  let todayRevenue = 0;
  let todayCost = 0;
  let todayPairsSold = todaySales.length;

  const paymentBreakdown = {
    cash: 0,
    credit: 0,
    mobile_pay: 0,
  };

  todaySales.forEach((sale) => {
    const paid = Number(sale.actualPaid) || 0;
    todayRevenue += paid;

    // Find cost of sold item (FIFO snapshotted cost preferred)
    const matchedProd = products.find((p) => p.sku === sale.sku || p.id === sale.productId);
    const itemCost =
      typeof sale.costPrice === 'number' && sale.costPrice >= 0
        ? sale.costPrice
        : matchedProd
        ? matchedProd.costPrice
        : Math.round(sale.retailPrice * 0.55);
    todayCost += itemCost;

    if (sale.paymentMethod === 'cash') paymentBreakdown.cash += paid;
    else if (sale.paymentMethod === 'credit') paymentBreakdown.credit += paid;
    else paymentBreakdown.mobile_pay += paid;
  });

  const todayGrossProfit = todayRevenue - todayCost;
  const todayGrossMarginPct = todayRevenue > 0 ? (todayGrossProfit / todayRevenue) * 100 : 0;
  const avgOrderValue = todayPairsSold > 0 ? todayRevenue / todayPairsSold : 0;

  // 2. Inventory Metrics
  let totalInventoryPairs = 0;
  let totalInventoryValuation = 0;
  let totalInventoryCostValuation = 0;

  products.forEach((p) => {
    const prodPairs = p.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
    totalInventoryPairs += prodPairs;
    totalInventoryValuation += prodPairs * p.retailPrice;
    totalInventoryCostValuation += calculateProductInventoryCost(p);
  });

  // Calculate annual estimated turnover and Days of Inventory on Hand (DOH)
  // Standard retail formula: DOH = (Average Inventory Cost / Daily COGS)
  const estimatedDailyCOGS = todayCost > 0 ? todayCost : Math.max(1000, totalInventoryCostValuation * 0.012);
  const daysOfInventoryOnHand =
    estimatedDailyCOGS > 0 && totalInventoryCostValuation > 0
      ? Math.round((totalInventoryCostValuation / estimatedDailyCOGS) * 10) / 10
      : 42;

  const inventoryTurnoverRate =
    daysOfInventoryOnHand > 0 ? Math.round((365 / daysOfInventoryOnHand) * 10) / 10 : 8.7;

  // 3. Golden Size Out-of-Stock Alerts (斷碼警戒)
  const brokenGoldenSizeAlerts: RetailAnalyticsSummary['brokenGoldenSizeAlerts'] = [];

  products.forEach((p) => {
    const totalRemainingPairs = p.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
    const outGoldenSizes: number[] = [];

    p.variants.forEach((v) => {
      if (GOLDEN_SIZES_US.includes(v.sizeUS) && v.stock <= 0) {
        outGoldenSizes.push(v.sizeUS);
      }
    });

    if (outGoldenSizes.length >= 2 && totalRemainingPairs > 0) {
      brokenGoldenSizeAlerts.push({
        product: p,
        outGoldenSizes,
        totalRemainingPairs,
      });
    }
  });

  // 4. Slow-Moving Stock Alerts (滯銷預警)
  const soldSkuSet = new Set(sales.map((s) => s.sku));
  const slowMovingAlerts: RetailAnalyticsSummary['slowMovingAlerts'] = [];

  products.forEach((p) => {
    const totalStock = p.variants.reduce((sum, v) => sum + Math.max(0, v.stock), 0);
    if (!soldSkuSet.has(p.sku) && totalStock >= 8) {
      slowMovingAlerts.push({
        product: p,
        stock: totalStock,
        daysInactive: 45,
        costTrapped: totalStock * p.costPrice,
      });
    }
  });

  // 5. Category Breakdown
  const categoryMap = new Map<string, { pairs: number; revenue: number; cost: number }>();
  todaySales.forEach((s) => {
    const cat = s.category || '其他';
    const curr = categoryMap.get(cat) || { pairs: 0, revenue: 0, cost: 0 };
    const paid = Number(s.actualPaid) || 0;
    const prod = products.find((p) => p.sku === s.sku || p.id === s.productId);
    const cost =
      typeof s.costPrice === 'number' && s.costPrice >= 0
        ? s.costPrice
        : prod
        ? prod.costPrice
        : Math.round(paid * 0.55);

    curr.pairs += 1;
    curr.revenue += paid;
    curr.cost += cost;
    categoryMap.set(cat, curr);
  });

  const categoryPerformance = Array.from(categoryMap.entries()).map(([category, stats]) => {
    const grossProfit = stats.revenue - stats.cost;
    const marginPct = stats.revenue > 0 ? (grossProfit / stats.revenue) * 100 : 0;
    const sharePct = todayRevenue > 0 ? (stats.revenue / todayRevenue) * 100 : 0;
    return {
      category,
      pairs: stats.pairs,
      revenue: stats.revenue,
      grossProfit,
      marginPct,
      sharePct,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // 6. Vendor Breakdown
  const vendorMap = new Map<string, { pairs: number; revenue: number; cost: number }>();
  todaySales.forEach((s) => {
    const v = s.brand || '其他廠商';
    const curr = vendorMap.get(v) || { pairs: 0, revenue: 0, cost: 0 };
    const paid = Number(s.actualPaid) || 0;
    const prod = products.find((p) => p.sku === s.sku || p.id === s.productId);
    const cost =
      typeof s.costPrice === 'number' && s.costPrice >= 0
        ? s.costPrice
        : prod
        ? prod.costPrice
        : Math.round(paid * 0.55);

    curr.pairs += 1;
    curr.revenue += paid;
    curr.cost += cost;
    vendorMap.set(v, curr);
  });

  const vendorPerformance = Array.from(vendorMap.entries()).map(([vendor, stats]) => {
    const grossProfit = stats.revenue - stats.cost;
    const sharePct = todayRevenue > 0 ? (stats.revenue / todayRevenue) * 100 : 0;
    return {
      vendor,
      pairs: stats.pairs,
      revenue: stats.revenue,
      grossProfit,
      sharePct,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return {
    todayRevenue,
    todayCost,
    todayGrossProfit,
    todayGrossMarginPct,
    todayPairsSold,
    avgOrderValue,
    totalInventoryPairs,
    totalInventoryValuation,
    totalInventoryCostValuation,
    inventoryTurnoverRate,
    daysOfInventoryOnHand,
    brokenGoldenSizeAlerts,
    slowMovingAlerts,
    categoryPerformance,
    vendorPerformance,
    paymentBreakdown,
  };
}
