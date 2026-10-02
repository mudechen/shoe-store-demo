import React, { useMemo } from 'react';
import { ProductWithVariants } from '../../types/inventory';
import { SaleRecord } from '../../types/sales';
import { calculateRetailAnalytics } from '../../services/analyticsService';
import {
  TrendingUp,
  Percent,
  Clock,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Receipt,
  Download,
  DollarSign,
  Layers,
} from 'lucide-react';
import { exportInventoryToExcel } from '../../services/excelService';

interface StoreAnalyticsViewProps {
  products: ProductWithVariants[];
  sales: SaleRecord[];
  onNavigateToStockIn?: (sku: string) => void;
}

export const StoreAnalyticsView: React.FC<StoreAnalyticsViewProps> = ({
  products,
  sales,
  onNavigateToStockIn,
}) => {
  const analytics = useMemo(() => {
    return calculateRetailAnalytics(products, sales);
  }, [products, sales]);

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      {/* 1. Core Retail KPI Quad-Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">門市營運健康度</h2>
              <p className="text-[11px] text-slate-500 font-medium">即時營收、毛利、週轉天數與斷碼診斷</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => exportInventoryToExcel(products)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black hover:bg-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>匯出報表</span>
          </button>
        </div>

        {/* 4 Core KPIs */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Today's Revenue */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/40 dark:to-indigo-900/20 border border-indigo-200/60 dark:border-indigo-800/60">
            <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
              <span className="text-[11px] font-black">今日營業額</span>
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              ${analytics.todayRevenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-bold mt-0.5">
              已售 {analytics.todayPairsSold} 雙 &bull; 客單價 ${Math.round(analytics.avgOrderValue)}
            </div>
          </div>

          {/* Gross Margin */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/60">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-[11px] font-black">實質毛利率</span>
              <Percent className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
              {analytics.todayGrossMarginPct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 font-bold mt-0.5 flex items-center justify-between">
              <span>毛利: ${Math.round(analytics.todayGrossProfit).toLocaleString()}</span>
              <span>成本: ${Math.round(analytics.todayCost).toLocaleString()}</span>
            </div>
          </div>

          {/* Days of Inventory on Hand (DOH) */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 border border-amber-200/60 dark:border-amber-800/60">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-[11px] font-black">庫存週轉天數 (DOH)</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {analytics.daysOfInventoryOnHand} 天
            </div>
            <div className="text-[10px] text-slate-500 font-bold mt-0.5">
              年週轉率: {analytics.inventoryTurnoverRate} 次/年
            </div>
          </div>

          {/* Inventory Valuation */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-800 dark:to-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
              <span className="text-[11px] font-black">在店總庫存雙數</span>
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white">
              {analytics.totalInventoryPairs} 雙
            </div>
            <div className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
              貨值: ${(analytics.totalInventoryValuation / 10000).toFixed(1)} 萬
            </div>
          </div>
        </div>
      </div>

      {/* 2. Critical Action Alerts: Broken Golden Sizes & Slow-Moving Stock */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-rose-500" />
          <span>門市急迫改善警戒</span>
        </h3>

        {/* Broken Golden Sizes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              熱門黃金碼斷碼警戒（客人買不到）
            </span>
            <span className="text-rose-600 font-bold text-[11px]">
              {analytics.brokenGoldenSizeAlerts.length} 款缺碼
            </span>
          </div>

          {analytics.brokenGoldenSizeAlerts.length === 0 ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-bold text-center">
              ✓ 全店黃金尺碼（US 8.0~10.0）皆有基本庫存，無緊急斷碼危機
            </div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {analytics.brokenGoldenSizeAlerts.map(({ product, outGoldenSizes, totalRemainingPairs }) => (
                <div
                  key={product.id}
                  className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-rose-700 dark:text-rose-300">
                        {product.sku}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold truncate max-w-[140px]">
                        {product.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-black mt-0.5">
                      缺碼: {outGoldenSizes.map((s) => {
                        const v = product.variants.find((variant) => Math.abs(variant.sizeUS - s) < 0.1);
                        return v?.sizeDisplay || (s % 1 === 0 ? `US ${s.toFixed(1)}` : `US ${s}`);
                      }).join(', ')}{' '}
                      <span className="text-slate-400 font-normal">(其餘剩 {totalRemainingPairs} 雙)</span>
                    </div>
                  </div>

                  {onNavigateToStockIn && (
                    <button
                      type="button"
                      onClick={() => onNavigateToStockIn(product.sku)}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black shrink-0 flex items-center gap-1 cursor-pointer"
                    >
                      <span>補貨</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Slow-Moving Stock Alerts */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-slate-700 dark:text-slate-300">
            <span>滯銷積壓款預警（久未賣出）</span>
            <span className="text-amber-600 font-bold text-[11px]">
              {analytics.slowMovingAlerts.length} 款待出清
            </span>
          </div>

          {analytics.slowMovingAlerts.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {analytics.slowMovingAlerts.slice(0, 4).map(({ product, stock, costTrapped }) => (
                <div
                  key={product.id}
                  className="p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {product.brand} {product.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      壓死成本: ${costTrapped.toLocaleString()} &bull; 囤積 {stock} 雙
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 font-black">
                    建議促銷
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Category & Vendor Share Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="text-sm font-black text-slate-900 dark:text-white">今日款式與廠商銷量分佈</h3>

        {analytics.categoryPerformance.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            今日尚無銷售紀錄，銷售開單後此處將自動產生佔比圖
          </div>
        ) : (
          <div className="space-y-3">
            {/* Category Bars */}
            <div className="space-y-2">
              <span className="text-[11px] font-black text-slate-500">各鞋款款式營收貢獻：</span>
              {analytics.categoryPerformance.map((cat) => (
                <div key={cat.category} className="space-y-0.5">
                  <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span>
                      {cat.category} ({cat.pairs} 雙)
                    </span>
                    <span>
                      ${cat.revenue.toLocaleString()} ({cat.sharePct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${Math.max(5, cat.sharePct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Vendor Bars */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-black text-slate-500">各廠商品牌營收排行：</span>
              {analytics.vendorPerformance.map((v) => (
                <div key={v.vendor} className="flex items-center justify-between text-xs font-bold py-0.5">
                  <span className="text-slate-800 dark:text-slate-200">{v.vendor}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono font-black">
                    {v.pairs} 雙 &bull; ${v.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Cashier Daily Reconciliation (打烊收銀對帳) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>打烊收銀錢櫃對帳</span>
          </h3>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
            實收合計: ${analytics.todayRevenue.toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 mb-0.5">💵 現金抽屜</div>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              ${analytics.paymentBreakdown.cash.toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 mb-0.5">💳 刷卡刷卡機</div>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              ${analytics.paymentBreakdown.credit.toLocaleString()}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 mb-0.5">📱 行動支付</div>
            <div className="text-sm font-black text-slate-900 dark:text-white">
              ${analytics.paymentBreakdown.mobile_pay.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
